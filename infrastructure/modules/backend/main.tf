variable "app_name"              {}
variable "environment"           {}
variable "aws_region"            {}
variable "registrations_table"   {}
variable "biometrics_bucket"     {}
variable "frontend_url"          {}
variable "from_email"            {}

# ── IAM Role for Lambda ───────────────────────────────────────
resource "aws_iam_role" "lambda" {
  name = "${var.app_name}-lambda-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${var.app_name}-lambda-policy"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"]
        Resource = ["arn:aws:dynamodb:${var.aws_region}:*:table/${var.registrations_table}", "arn:aws:dynamodb:${var.aws_region}:*:table/${var.registrations_table}/index/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "arn:aws:s3:::${var.biometrics_bucket}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

locals {
  env_vars = {
    REGISTRATIONS_TABLE = var.registrations_table
    BIOMETRICS_BUCKET   = var.biometrics_bucket
    FRONTEND_URL        = var.frontend_url
    FROM_EMAIL          = var.from_email
    AWS_REGION_NAME     = var.aws_region
  }
}

# ── Lambda Functions ──────────────────────────────────────────
resource "aws_lambda_function" "profile" {
  function_name    = "${var.app_name}-profile-${var.environment}"
  filename         = "${path.module}/../../../backend/function.zip"
  handler          = "src/handlers/profile.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  timeout          = 30
  environment { variables = local.env_vars }
}

resource "aws_lambda_function" "registration" {
  function_name    = "${var.app_name}-registration-${var.environment}"
  filename         = "${path.module}/../../../backend/function.zip"
  handler          = "src/handlers/registration.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  timeout          = 15
  environment { variables = local.env_vars }
}

resource "aws_lambda_function" "lookup" {
  function_name    = "${var.app_name}-lookup-${var.environment}"
  filename         = "${path.module}/../../../backend/function.zip"
  handler          = "src/handlers/lookup.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  timeout          = 15
  environment { variables = local.env_vars }
}

resource "aws_lambda_function" "biometrics" {
  function_name    = "${var.app_name}-biometrics-${var.environment}"
  filename         = "${path.module}/../../../backend/function.zip"
  handler          = "src/handlers/biometrics.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  timeout          = 30
  environment { variables = local.env_vars }
}

resource "aws_lambda_function" "biometrics_upload_url" {
  function_name    = "${var.app_name}-biometrics-upload-url-${var.environment}"
  filename         = "${path.module}/../../../backend/function.zip"
  handler          = "src/handlers/biometrics.getUploadUrl"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  timeout          = 10
  environment { variables = local.env_vars }
}

# ── API Gateway ───────────────────────────────────────────────
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.app_name}-api-${var.environment}"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = [var.frontend_url]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "prod"
  auto_deploy = true
}

# Integrations
locals {
  routes = {
    "POST /profile"              = aws_lambda_function.profile.invoke_arn
    "POST /registration"         = aws_lambda_function.registration.invoke_arn
    "POST /lookup"               = aws_lambda_function.lookup.invoke_arn
    "POST /biometrics"           = aws_lambda_function.biometrics.invoke_arn
    "GET /biometrics/upload-url" = aws_lambda_function.biometrics_upload_url.invoke_arn
  }
  lambda_arns = {
    "POST /profile"              = aws_lambda_function.profile.arn
    "POST /registration"         = aws_lambda_function.registration.arn
    "POST /lookup"               = aws_lambda_function.lookup.arn
    "POST /biometrics"           = aws_lambda_function.biometrics.arn
    "GET /biometrics/upload-url" = aws_lambda_function.biometrics_upload_url.arn
  }
}

resource "aws_apigatewayv2_integration" "lambdas" {
  for_each               = local.routes
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = each.value
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each  = local.routes
  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.lambdas[each.key].id}"
}

resource "aws_lambda_permission" "api_gw" {
  for_each      = local.lambda_arns
  statement_id  = "AllowAPIGateway-${replace(replace(each.key, " ", "-"), "/", "-")}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

output "api_gateway_url" { value = aws_apigatewayv2_stage.prod.invoke_url }
