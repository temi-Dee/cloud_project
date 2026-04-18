terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "nysc-terraform-state"
    key    = "nysc/terraform.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Tier 3: Database ──────────────────────────────────────────
module "database" {
  source     = "./modules/database"
  app_name   = var.app_name
  environment = var.environment
}

# ── Tier 2: Backend (Lambda + API Gateway) ────────────────────
module "backend" {
  source               = "./modules/backend"
  app_name             = var.app_name
  environment          = var.environment
  aws_region           = var.aws_region
  registrations_table  = module.database.registrations_table_name
  biometrics_bucket    = module.database.biometrics_bucket_name
  frontend_url         = "https://${module.frontend.cloudfront_domain}"
  from_email           = var.from_email
}

# ── Tier 1: Frontend (S3 + CloudFront) ───────────────────────
module "frontend" {
  source      = "./modules/frontend"
  app_name    = var.app_name
  environment = var.environment
  api_url     = module.backend.api_gateway_url
}
