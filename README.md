# NYSC Registration Portal — 3-Tier Cloud-Native AWS Application

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        TIER 1: FRONTEND                      │
│   React (Vite + TypeScript)  →  S3  →  CloudFront (CDN)     │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS API calls
┌─────────────────────────▼───────────────────────────────────┐
│                        TIER 2: BACKEND                       │
│   API Gateway (HTTP)  →  AWS Lambda (Node.js 20)            │
│   Routes:                                                    │
│     POST /profile       → profile.handler                   │
│     POST /registration  → registration.handler              │
│     POST /lookup        → lookup.handler                    │
│     POST /biometrics    → biometrics.handler                │
│     GET  /biometrics/upload-url → biometrics.getUploadUrl   │
└─────────────────────────┬───────────────────────────────────┘
                          │ AWS SDK calls
┌─────────────────────────▼───────────────────────────────────┐
│                        TIER 3: DATABASE                      │
│   DynamoDB (registrations)  +  S3 (biometric files)         │
│   SES (email notifications)                                  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
FIRST PROJECT/
├── frontend/               ← Tier 1: React app
│   ├── src/
│   │   ├── NYSC.tsx        ← Main registration UI
│   │   ├── api.ts          ← API service layer
│   │   └── main.tsx        ← React entry point
│   ├── index.html
│   └── package.json
│
├── backend/                ← Tier 2: Lambda functions
│   └── src/
│       ├── handlers/
│       │   ├── profile.js       ← Step 1: Create profile + send email
│       │   ├── registration.js  ← Step 2: Validate NIN + CAPTCHA
│       │   ├── lookup.js        ← Step 3: Institution lookup
│       │   └── biometrics.js    ← Step 4: Biometric submission
│       ├── db.js           ← DynamoDB client
│       ├── response.js     ← CORS response helper
│       └── server.js       ← Local dev Express wrapper
│
├── infrastructure/         ← Terraform (AWS resources)
│   ├── main.tf             ← Root module
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── frontend/       ← S3 + CloudFront
│       ├── backend/        ← Lambda + API Gateway + IAM
│       └── database/       ← DynamoDB + S3 biometrics
│
├── docker/                 ← Dockerfiles
├── docker-compose.yml      ← Local dev environment
└── .github/workflows/      ← CI/CD pipeline
    └── deploy.yml
```

---

## Prerequisites

- AWS Account with programmatic access
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [Node.js](https://nodejs.org) >= 20
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local dev)
- AWS CLI configured: `aws configure`

---

## Option A: Run Locally with Docker

```bash
docker-compose up --build
```

Then open: http://localhost:5173

---

## Option B: Deploy to AWS

### Step 1 — Create Terraform state bucket
```bash
aws s3 mb s3://nysc-terraform-state --region eu-west-1
```

### Step 2 — Verify your SES email
```bash
aws ses verify-email-identity --email-address noreply@yourdomain.com --region eu-west-1
```

### Step 3 — Package the Lambda functions
```bash
cd backend
npm install --omit=dev
zip -r function.zip src node_modules package.json
cd ..
```

### Step 4 — Deploy infrastructure with Terraform
```bash
cd infrastructure
terraform init
terraform apply -var="from_email=noreply@yourdomain.com"
```

### Step 5 — Build and deploy the frontend
```bash
cd frontend
cp .env.example .env
# Edit .env and set VITE_API_URL to the API Gateway URL from Step 4 output
npm install
npm run build
aws s3 sync dist/ s3://YOUR_FRONTEND_BUCKET --delete
```

---

## Option C: Automated CI/CD via GitHub Actions

1. Push this repo to GitHub
2. Add these secrets in GitHub → Settings → Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `FROM_EMAIL`
3. Push to `main` branch — the pipeline deploys everything automatically

---

## AWS Services Used

| Service | Purpose |
|---------|---------|
| S3 | Frontend hosting + biometric file storage |
| CloudFront | CDN — fast global delivery of the React app |
| API Gateway | HTTP API routing to Lambda functions |
| Lambda | Serverless backend (Node.js 20) |
| DynamoDB | NoSQL database for registration records |
| SES | Transactional email (registration link) |
| IAM | Least-privilege roles for Lambda |
| Terraform | Infrastructure as Code |

---

## DynamoDB Data Model

**Table:** `nysc-registrations`  
**PK:** `PROFILE#<email>` | **SK:** `PROFILE`

| Field | Description |
|-------|-------------|
| registrationId | UUID |
| firstName, lastName | Personal info |
| email, phone | Contact |
| nin | National ID |
| institution, jambReg | Academic info |
| stateOfOrigin, course | Origin details |
| biometrics | `{thumbprintLeft, thumbprintRight, faceCapture}` |
| status | `PROFILE_CREATED → NIN_VERIFIED → MOBILISATION_VERIFIED → REGISTRATION_COMPLETE` |
| createdAt, completedAt | Timestamps |
