# ── DynamoDB: Registrations Table ────────────────────────────
resource "aws_dynamodb_table" "registrations" {
  name         = "${var.app_name}-registrations-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  attribute {
    name = "registrationId"
    type = "S"
  }

  global_secondary_index {
    name            = "registrationId-index"
    hash_key        = "registrationId"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }
  server_side_encryption { enabled = true }

  tags = {
    Name        = "${var.app_name}-registrations"
    Environment = var.environment
  }
}

# ── S3: Biometrics Storage ────────────────────────────────────
resource "aws_s3_bucket" "biometrics" {
  bucket = "${var.app_name}-biometrics-${var.environment}-${data.aws_caller_identity.current.account_id}"
  tags   = { Name = "${var.app_name}-biometrics", Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "biometrics" {
  bucket = aws_s3_bucket.biometrics.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "biometrics" {
  bucket = aws_s3_bucket.biometrics.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "biometrics" {
  bucket                  = aws_s3_bucket.biometrics.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_caller_identity" "current" {}

variable "app_name"    {}
variable "environment" {}

output "registrations_table_name" { value = aws_dynamodb_table.registrations.name }
output "biometrics_bucket_name"   { value = aws_s3_bucket.biometrics.bucket }
