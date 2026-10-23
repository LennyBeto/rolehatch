# infra/main.tf
terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

variable "project_id" { type = string }

variable "scheduler_secret" {
  type      = string
  sensitive = true # pass via TF_VAR_scheduler_secret or -var, never commit the real value
}

# Base URL the schedulers call. Defaults to the current domain so applying this file
# changes nothing by itself; after the DNS cutover run with
#   -var api_base_url=https://api.perchrole.com
# On a brand-new project, pass the Cloud Run URL (or the new domain) on first apply.
variable "api_base_url" {
  type    = string
  default = "https://api.rolehatch.com"
}

# Identity Cloud Build runs as. Leave empty for the legacy
# <project-number>@cloudbuild.gserviceaccount.com account. Newer projects run builds as the
# default compute service account; for those, pass
#   -var build_service_account_email=<project-number>-compute@developer.gserviceaccount.com
# (check Cloud Build > Settings to see which one your project uses).
variable "build_service_account_email" {
  type    = string
  default = ""
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_artifact_registry_repository" "rolehatch" {
  repository_id = "rolehatch"
  format        = "DOCKER"
  location      = "us-central1"
}

resource "google_secret_manager_secret" "secrets" {
  for_each = toset([
    "database-url", "supabase-jwt-secret", "upstash-token",
    "scheduler-secret",
    "paystack-secret-key",
    "revalidate-secret", # used by the post-sync frontend revalidation in internal.py
    "gemini-api-key",    # Perchie chatbot (Google AI Studio)
    # "anthropic-api-key", # Previous Perchie provider (Anthropic), uncomment to switch back
  ])
  secret_id = each.key
  replication { auto {} }
}
# NOTE: secret VALUES are never set here. Add versions manually via
# `gcloud secrets versions add`, keeping them out of source control and Terraform state.

resource "google_cloud_scheduler_job" "sync_jobs" {
  name             = "rolehatch-sync"
  region           = "us-central1"
  schedule         = "0 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "1800s" # Cloud Scheduler's maximum for HTTP targets; Cloud Run --timeout must be >= this

  # No retries: the sync holds a Redis lock, so a retry would just return "skipped".
  retry_config {
    retry_count = 0
  }

  http_target {
    uri         = "${var.api_base_url}/internal/sync-jobs"
    http_method = "POST"
    headers = {
      "X-Scheduler-Secret" = var.scheduler_secret
    }
  }
}

# Daily cleanup of saved jobs hidden for more than 5 days (POST /internal/purge-hidden-jobs)
resource "google_cloud_scheduler_job" "purge_hidden_jobs" {
  name             = "rolehatch-purge-hidden"
  region           = "us-central1"
  schedule         = "0 3 * * *"
  time_zone        = "UTC"
  attempt_deadline = "180s"

  http_target {
    uri         = "${var.api_base_url}/internal/purge-hidden-jobs"
    http_method = "POST"
    headers = {
      "X-Scheduler-Secret" = var.scheduler_secret
    }
  }
}

# Service accounts are named after the project NUMBER, not the project ID.
locals {
  legacy_cloudbuild_sa = "${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
  cloudbuild_sa_email  = var.build_service_account_email != "" ? var.build_service_account_email : local.legacy_cloudbuild_sa
  cloudbuild_sa        = "serviceAccount:${local.cloudbuild_sa_email}"

  # Cloud Run runs as the default compute service account unless the service sets another one.
  runtime_sa = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = local.cloudbuild_sa
}

# The pipeline's migration step reads `database-url` with gcloud.
resource "google_project_iam_member" "cloudbuild_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = local.cloudbuild_sa
}

# Needed to deploy a Cloud Run revision that runs as the default compute service account.
resource "google_project_iam_member" "cloudbuild_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = local.cloudbuild_sa
}

# Push built images to Artifact Registry (not automatic when builds run as the compute SA).
resource "google_project_iam_member" "cloudbuild_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = local.cloudbuild_sa
}

# Write build logs (cloudbuild.yaml uses CLOUD_LOGGING_ONLY).
resource "google_project_iam_member" "cloudbuild_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = local.cloudbuild_sa
}

# Read the source archive uploaded by `gcloud builds submit`.
resource "google_project_iam_member" "cloudbuild_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = local.cloudbuild_sa
}

# The running Cloud Run service reads its --update-secrets at startup. Without this the
# revision fails to become ready with a permission error on the first secret.
resource "google_project_iam_member" "runtime_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = local.runtime_sa
}