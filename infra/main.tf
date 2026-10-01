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
    "scheduler-secret", "stripe-secret-key", "stripe-webhook-secret",
    "revalidate-secret", # used by the post-sync frontend revalidation in internal.py
  ])
    for_each  = toset([
    "database-url", "supabase-jwt-secret", "upstash-token",
    "scheduler-secret", "stripe-secret-key", "stripe-webhook-secret",
    "anthropic-api-key",
  ])
  secret_id = each.key
  replication { auto {} }
}
# NOTE: secret VALUES are never set here — add versions manually via
# `gcloud secrets versions add`, keeping them out of source control and Terraform state.

resource "google_cloud_scheduler_job" "sync_jobs" {
  name             = "rolehatch-sync"
  region           = "us-central1"
  schedule         = "0 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "900s" # matches Cloud Run --timeout=900 so a full sync can finish

  retry_config {
    retry_count = 1
  }

  http_target {
    uri         = "https://api.rolehatch.com/internal/sync-jobs"
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
    uri         = "https://api.rolehatch.com/internal/purge-hidden-jobs"
    http_method = "POST"
    headers = {
      "X-Scheduler-Secret" = var.scheduler_secret
    }
  }
}

# Cloud Build's service account is named after the project NUMBER, not the project ID.
locals {
  cloudbuild_sa = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
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