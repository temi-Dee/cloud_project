variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-west-1"
}

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "nysc"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "from_email" {
  description = "Verified SES email address for sending registration emails"
  type        = string
}
