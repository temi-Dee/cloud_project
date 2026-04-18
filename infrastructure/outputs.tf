output "frontend_url" {
  description = "CloudFront URL for the NYSC frontend"
  value       = "https://${module.frontend.cloudfront_domain}"
}

output "api_gateway_url" {
  description = "API Gateway URL for the backend"
  value       = module.backend.api_gateway_url
}

output "registrations_table" {
  description = "DynamoDB table name"
  value       = module.database.registrations_table_name
}

output "biometrics_bucket" {
  description = "S3 bucket for biometric data"
  value       = module.database.biometrics_bucket_name
}
