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

resource "google_artifact_registry_repository" "rolehatch" {
  repository_id = "rolehatch"
  format        = "DOCKER"
  location      = "us-central1"
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset([
    "database-url", "supabase-jwt-secret", "upstash-token",
    "scheduler-secret", "stripe-secret-key", "stripe-webhook-secret",
  ])
  secret_id = each.key
  replication { auto {} }
}
# NOTE: secret VALUES are never set here — add versions manually via
# `gcloud secrets versions add`, keeping them out of source control and Terraform state.

resource "google_cloud_scheduler_job" "sync_jobs" {
  name      = "rolehatch-sync"
  schedule  = "0 * * * *"
  time_zone = "UTC"

  http_target {
    uri         = "https://api.rolehatch.com/internal/sync-jobs"
    http_method = "POST"
    headers = {
      "X-Scheduler-Secret" = "REPLACE_AT_APPLY_TIME"  # inject via -var, never commit the real value
    }
  }
}

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${var.project_id}@cloudbuild.gserviceaccount.com"
}