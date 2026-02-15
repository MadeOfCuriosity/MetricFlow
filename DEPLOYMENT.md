# MetricFlow AWS Deployment Guide

This guide covers deploying MetricFlow to AWS using:
- **AWS RDS PostgreSQL** for the database
- **AWS App Runner** for the backend API
- **AWS Amplify** for the frontend
- **AWS Secrets Manager** for sensitive configuration

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- GitHub repository with your MetricFlow code
- Domain name (optional, for custom domains)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AWS Amplify   │────▶│  AWS App Runner │────▶│   AWS RDS       │
│   (Frontend)    │     │   (Backend)     │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ Secrets Manager │
                        └─────────────────┘
```

---

## Step 1: Set Up AWS RDS PostgreSQL

### 1.1 Create a VPC (if not using default)

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=metricflow-vpc}]'

# Note the VPC ID from output
```

### 1.2 Create Security Group for RDS

```bash
# Create security group
aws ec2 create-security-group \
  --group-name metricflow-db-sg \
  --description "Security group for MetricFlow RDS" \
  --vpc-id <your-vpc-id>

# Allow PostgreSQL access (restrict to App Runner in production)
aws ec2 authorize-security-group-ingress \
  --group-id <security-group-id> \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0
```

### 1.3 Create RDS Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name metricflow-db-subnet \
  --db-subnet-group-description "Subnet group for MetricFlow RDS" \
  --subnet-ids <subnet-id-1> <subnet-id-2>
```

### 1.4 Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier metricflow-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username metricflow_admin \
  --master-user-password <your-secure-password> \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids <security-group-id> \
  --db-subnet-group-name metricflow-db-subnet \
  --db-name metricflow \
  --publicly-accessible \
  --backup-retention-period 7 \
  --storage-encrypted
```

### 1.5 Wait for RDS to be Available

```bash
aws rds wait db-instance-available --db-instance-identifier metricflow-db
```

### 1.6 Get RDS Endpoint

```bash
aws rds describe-db-instances \
  --db-instance-identifier metricflow-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

---

## Step 2: Set Up AWS Secrets Manager

### 2.1 Create Database URL Secret

```bash
aws secretsmanager create-secret \
  --name metricflow/database-url \
  --description "MetricFlow database connection string" \
  --secret-string "postgresql://metricflow_admin:<password>@<rds-endpoint>:5432/metricflow"
```

### 2.2 Create JWT Secret

```bash
# Generate a secure secret key
SECRET_KEY=$(openssl rand -hex 32)

aws secretsmanager create-secret \
  --name metricflow/jwt-secret \
  --description "MetricFlow JWT signing key" \
  --secret-string "$SECRET_KEY"
```

### 2.3 Note the Secret ARNs

```bash
# Get Database URL ARN
aws secretsmanager describe-secret \
  --secret-id metricflow/database-url \
  --query 'ARN' --output text

# Get JWT Secret ARN
aws secretsmanager describe-secret \
  --secret-id metricflow/jwt-secret \
  --query 'ARN' --output text
```

---

## Step 3: Deploy Backend with AWS App Runner

### 3.1 Create IAM Role for App Runner

Create a file `app-runner-role-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```bash
# Create the role
aws iam create-role \
  --role-name MetricFlowAppRunnerRole \
  --assume-role-policy-document file://app-runner-role-policy.json
```

### 3.2 Attach Secrets Manager Policy

Create `secrets-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:REGION:ACCOUNT:secret:metricflow/*"
      ]
    }
  ]
}
```

```bash
aws iam put-role-policy \
  --role-name MetricFlowAppRunnerRole \
  --policy-name SecretsAccess \
  --policy-document file://secrets-policy.json
```

### 3.3 Update apprunner.yaml

Update `backend/apprunner.yaml` with your actual secret ARNs:

```yaml
version: 1.0
runtime: python311

build:
  commands:
    pre-build:
      - echo "Installing system dependencies..."
    build:
      - pip install -r requirements.txt

run:
  command: sh -c "python -c 'from alembic.config import Config; from alembic import command; cfg = Config(\"alembic.ini\"); command.upgrade(cfg, \"head\")' && uvicorn main:app --host 0.0.0.0 --port 8000"
  network:
    port: 8000
    env: APP_PORT
  env:
    - name: ENVIRONMENT
      value: "production"
    - name: FRONTEND_URL
      value: "https://your-amplify-app.amplifyapp.com"
  secrets:
    - name: DATABASE_URL
      value-from: "arn:aws:secretsmanager:us-east-1:123456789:secret:metricflow/database-url-xxxxx"
    - name: SECRET_KEY
      value-from: "arn:aws:secretsmanager:us-east-1:123456789:secret:metricflow/jwt-secret-xxxxx"
```

### 3.4 Create App Runner Service via Console

1. Go to **AWS App Runner Console**
2. Click **Create service**
3. Select **Source code repository**
4. Connect your GitHub account
5. Select your repository and branch (`main`)
6. Set **Source directory** to `/backend`
7. Select **Python 3.11** runtime
8. Configure build settings (uses `apprunner.yaml` automatically)
9. Set instance configuration:
   - CPU: 1 vCPU
   - Memory: 2 GB
10. Add environment variables from Secrets Manager
11. Configure health check:
    - Path: `/health`
    - Protocol: HTTP
    - Interval: 10 seconds
    - Timeout: 5 seconds
12. Click **Create & deploy**

### 3.5 Get App Runner URL

After deployment completes, note the service URL (e.g., `https://xxxxx.us-east-1.awsapprunner.com`)

---

## Step 4: Deploy Frontend with AWS Amplify

### 4.1 Create Amplify App via Console

1. Go to **AWS Amplify Console**
2. Click **New app** → **Host web app**
3. Select **GitHub** and authorize
4. Choose your repository
5. Select branch (`main`)
6. Configure build settings:
   - App name: `metricflow`
   - Framework: **Vite**
   - Build command: (uses `amplify.yml` automatically)
   - Base directory: `frontend`

### 4.2 Add Environment Variables

In Amplify Console → App settings → Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://xxxxx.us-east-1.awsapprunner.com` |

### 4.3 Configure Rewrites for SPA

In Amplify Console → App settings → Rewrites and redirects:

Add this rule:
- Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
- Target: `/index.html`
- Type: `200 (Rewrite)`

### 4.4 Deploy

Click **Save and deploy**. Amplify will:
1. Clone your repository
2. Build the frontend
3. Deploy to CDN

### 4.5 Get Amplify URL

After deployment, note the URL (e.g., `https://main.xxxxx.amplifyapp.com`)

---

## Step 5: Update CORS Configuration

### 5.1 Update Backend FRONTEND_URL

In App Runner, update the `FRONTEND_URL` environment variable to your Amplify URL.

### 5.2 Redeploy Backend

App Runner will automatically redeploy when you update environment variables.

---

## Step 6: Set Up Custom Domain (Optional)

### 6.1 Frontend Custom Domain

1. In Amplify Console → Domain management
2. Click **Add domain**
3. Enter your domain (e.g., `app.metricflow.com`)
4. Follow DNS configuration instructions

### 6.2 Backend Custom Domain

1. In App Runner → Custom domains
2. Click **Link domain**
3. Enter your domain (e.g., `api.metricflow.com`)
4. Update DNS with provided CNAME records

---

## Step 7: Monitoring and Logging

### 7.1 Enable CloudWatch Logs

App Runner automatically sends logs to CloudWatch. View them at:
- CloudWatch → Log groups → `/aws/apprunner/metricflow-backend/...`

### 7.2 Set Up Alarms

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "MetricFlow-HighErrorRate" \
  --metric-name "5xxErrors" \
  --namespace "AWS/AppRunner" \
  --statistic Average \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

---

## Troubleshooting

### Database Connection Issues

1. Verify RDS security group allows connections from App Runner
2. Check the DATABASE_URL secret is correctly formatted
3. Verify RDS is publicly accessible or VPC is properly configured

```bash
# Test database connection
psql "postgresql://metricflow_admin:<password>@<rds-endpoint>:5432/metricflow"
```

### App Runner Deployment Failures

1. Check build logs in App Runner console
2. Verify all secrets are accessible
3. Ensure `requirements.txt` includes all dependencies

```bash
# View App Runner logs
aws logs tail /aws/apprunner/metricflow-backend/service --follow
```

### Amplify Build Failures

1. Check build logs in Amplify console
2. Verify `amplify.yml` syntax
3. Ensure environment variables are set

### CORS Errors

1. Verify `FRONTEND_URL` matches Amplify URL exactly (including https://)
2. Check browser console for specific CORS error messages
3. Verify App Runner deployed with updated configuration

---

## Cost Estimation

| Service | Estimated Monthly Cost |
|---------|----------------------|
| RDS db.t3.micro | ~$15-25 |
| App Runner (1 vCPU, 2GB) | ~$25-50 |
| Amplify Hosting | ~$5-15 |
| Secrets Manager (2 secrets) | ~$1 |
| Data Transfer | Variable |
| **Total** | **~$50-100/month** |

*Costs vary based on usage. Use AWS Calculator for accurate estimates.*

---

## Security Checklist

- [ ] RDS encryption enabled
- [ ] Secrets stored in Secrets Manager
- [ ] App Runner uses HTTPS only
- [ ] CORS restricted to frontend domain
- [ ] Database not publicly accessible (use VPC connector)
- [ ] Strong passwords for all services
- [ ] CloudWatch alarms configured
- [ ] Regular backups enabled for RDS

---

## CI/CD Pipeline

Both App Runner and Amplify support automatic deployments from GitHub:

1. Push to `main` branch
2. App Runner detects changes → Rebuilds and deploys backend
3. Amplify detects changes → Rebuilds and deploys frontend

For more control, consider using GitHub Actions with the deployment workflows.
