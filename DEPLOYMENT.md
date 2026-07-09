# MetricFlow AWS Deployment Guide

This guide covers deploying MetricFlow to AWS using:
- **AWS RDS PostgreSQL** for the database — private, not internet-reachable
- **AWS App Runner** for the backend API — deployed from a container image, not from source
- **AWS Amplify** for the frontend
- **AWS Secrets Manager** for sensitive configuration
- **A NAT Gateway + private subnets** so App Runner can reach RDS privately while still reaching the internet (Gemini, Razorpay, Google/Zoho OAuth) for outbound API calls

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- GitHub repository with your MetricFlow code
- Domain name (optional, for custom domains)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   AWS Amplify   │────▶│  AWS App Runner │
│   (Frontend)    │     │   (Backend)     │
└─────────────────┘     └────────┬────────┘
                                  │ VPC connector
                                  ▼
                         ┌─────────────────┐        ┌──────────────┐
                         │  Private subnet │───────▶│  NAT Gateway │──▶ Internet
                         │   (VPC only)    │        │              │   (Gemini, Razorpay,
                         └────────┬────────┘        └──────────────┘    Google/Zoho OAuth)
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   AWS RDS       │
                         │  (PostgreSQL,   │
                         │ not public)     │
                         └─────────────────┘

                         ┌─────────────────┐
                         │ Secrets Manager │◀── App Runner reads all app secrets from here
                         └─────────────────┘
```

The backend is **not** deployed via App Runner's "build from source" mode — a GitHub Actions workflow (`.github/workflows/deploy.yml`) builds a Docker image from `backend/`, pushes it to ECR, and App Runner auto-deploys on every push to `main` (`AutoDeploymentsEnabled: true`). There is no `apprunner.yaml` in this setup — the container's `CMD` (in `backend/Dockerfile`) controls what runs on boot.

Without a VPC connector, App Runner has no path into your VPC, so RDS would have to be publicly accessible for the backend to reach it — this is why the two are paired below rather than treated as separate steps. **The app's tenant isolation is entirely at the application query layer** (every query filters `org_id` manually, no DB-level row security) — a publicly reachable database defeats that isolation regardless of password strength, so RDS must stay off the public internet.

---

## Step 1: Networking — VPC, NAT Gateway, and private RDS

### 1.1 Private subnets for the App Runner VPC connector

Create at least two private subnets (different AZs) in the VPC that will host RDS. These do **not** need `--map-public-ip-on-launch`.

```bash
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block <unused-/20> --availability-zone <az-a> \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=metricflow-private-a}]'
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block <unused-/20> --availability-zone <az-b> \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=metricflow-private-b}]'
```

### 1.2 NAT Gateway (for outbound internet access from the private subnets)

```bash
EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
NAT_ID=$(aws ec2 create-nat-gateway --subnet-id <an-existing-public-subnet> --allocation-id "$EIP_ALLOC" \
  --query 'NatGateway.NatGatewayId' --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT_ID"
```

Create a route table for the private subnets that sends `0.0.0.0/0` to the NAT Gateway, and associate both private subnets with it:

```bash
RT_ID=$(aws ec2 create-route-table --vpc-id <vpc-id> --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id "$RT_ID" --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$NAT_ID"
aws ec2 associate-route-table --route-table-id "$RT_ID" --subnet-id <private-subnet-a>
aws ec2 associate-route-table --route-table-id "$RT_ID" --subnet-id <private-subnet-b>
```

Cost note: a NAT Gateway runs ~$0.045/hr (~$32+/mo) plus data processing charges — this is the price of RDS not being on the public internet. There's no cheaper AWS-native way to give App Runner both private RDS access and internet egress at the same time.

### 1.3 App Runner VPC connector

```bash
CONNECTOR_SG=$(aws ec2 create-security-group --group-name metricflow-apprunner-connector-sg \
  --description "Egress SG for App Runner VPC connector" --vpc-id <vpc-id> --query 'GroupId' --output text)

CONNECTOR_ARN=$(aws apprunner create-vpc-connector \
  --vpc-connector-name metricflow-backend-connector \
  --subnets <private-subnet-a> <private-subnet-b> \
  --security-groups "$CONNECTOR_SG" \
  --query 'VpcConnector.VpcConnectorArn' --output text)
```

### 1.4 RDS: private subnet group, security group scoped to the connector only, not publicly accessible

Use a DB subnet group backed by the **private** subnets (or your existing default VPC subnets, as long as the security group below is tight). Do **not** pass `--publicly-accessible`.

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name metricflow-db-subnet \
  --db-subnet-group-description "Subnet group for MetricFlow RDS" \
  --subnet-ids <subnet-id-1> <subnet-id-2>

# See "Master password" below instead of an inline --master-user-password.
aws rds create-db-instance \
  --db-instance-identifier metricflow-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username metricflow_admin \
  --manage-master-user-password \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids <rds-security-group-id> \
  --db-subnet-group-name metricflow-db-subnet \
  --db-name metricflow \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --storage-encrypted

aws rds wait db-instance-available --db-instance-identifier metricflow-db
```

Scope the RDS security group's ingress to **only** the VPC connector's security group — not a CIDR block:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id <rds-security-group-id> \
  --protocol tcp --port 5432 \
  --source-group "$CONNECTOR_SG"
```

If you're changing an **existing, already-public** instance rather than provisioning fresh, the safe order is: create the VPC connector and attach it to App Runner first (Step 3.3), confirm `/health` still reports `"database": "connected"`, *then* tighten the RDS security group and flip `--no-publicly-accessible` — in that order, so you never remove connectivity before the replacement path is proven to work.

### Master password

Don't pass `--master-user-password <plaintext>` on the CLI — it leaks into shell history and process listings. Use `--manage-master-user-password` (shown above) to have RDS generate and manage the password in Secrets Manager, or source it from a non-echoed prompt / an existing secret if you need a specific value.

---

## Step 2: Set Up AWS Secrets Manager

The app's required secrets (audit source: `backend/app/core/config.py`, in particular `validate_required_secrets()`, plus every `Optional[str]`/required field read from env) go beyond `DATABASE_URL` and JWT `SECRET_KEY`. At minimum, production needs:

| Secret | Used for |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SECRET_KEY` | JWT signing |
| `ENCRYPTION_KEY` | Fernet key encrypting integration OAuth tokens/API keys at rest (`Integration` model) — without it, connectors can't store or read credentials |
| `GEMINI_API_KEY` | AI KPI builder + admin AI agent. Missing key: the admin agent fails loudly (503); the KPI-builder chat silently falls back to a mock response — don't rely on the app "looking fine" as proof this is set |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Subscription creation/checkout |
| `RAZORPAY_WEBHOOK_SECRET` | Verifying Razorpay webhook signatures — billing state silently stops updating without it, no visible error |

`GOOGLE_OAUTH_CLIENT_ID/SECRET` and `ZOHO_OAUTH_CLIENT_ID/SECRET` are `Optional[str]` in `config.py` — required only if you're enabling those specific integrations, not for baseline startup.

```bash
for name in database-url jwt-secret encryption-key gemini-api-key razorpay-key-id razorpay-key-secret razorpay-webhook-secret; do
  aws secretsmanager create-secret --name "metricflow/$name" --secret-string "<value>"
done
```

Re-run the audit (`grep -rn "os.environ\|getenv\|settings\." backend/app/core/config.py`) whenever a new integration or feature adds a required env var — this list is a snapshot, not a guarantee it stays complete.

---

## Step 3: Deploy Backend with AWS App Runner (image-repository mode)

### 3.1 GitHub Actions → ECR

`.github/workflows/deploy.yml` builds `backend/Dockerfile` and pushes to ECR (`:latest` and `:$GITHUB_SHA`) on every push to `main`. Requires `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` repo secrets with ECR push permission.

### 3.2 Create the App Runner service (first time only)

Console: **App Runner → Create service → Container registry → Amazon ECR**, point at the `metricflow-backend` repository, enable **automatic deployments**. Configure:
- CPU/memory (1 vCPU / 2GB is a reasonable start)
- Port `8000`
- Environment variables: `ENVIRONMENT=production`, `FRONTEND_URL=<amplify-url>`, `RAZORPAY_PLAN_IDS=<plan_code:razorpay_plan_id,...>`
- Environment **secrets**: wire every entry from the Step 2 table via its Secrets Manager ARN
- Health check path `/health`

### 3.3 Attach the VPC connector

```bash
aws apprunner update-service --service-arn <service-arn> \
  --network-configuration '{"EgressConfiguration":{"EgressType":"VPC","VpcConnectorArn":"<connector-arn>"}}'
```

This triggers a new deployment. Wait for `Status: RUNNING`, then confirm `GET /health` reports `"database": "connected"` before doing anything to RDS's network access (see the note at the end of Step 1.4).

### 3.4 Migrations don't run as part of this step

Migrations run inside the container on boot (`start.sh` → `scripts/run_migrations.py`), under a Postgres advisory lock, and fail the container boot loudly if they fail — they are **not** a separate manual deploy step, and are safe under App Runner's autoscaling (up to the service's configured max instance count) because concurrent instance boots serialize on the lock instead of racing each other.

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
| `VITE_API_URL` | App Runner service URL |

### 4.3 Configure Rewrites for SPA

In Amplify Console → App settings → Rewrites and redirects:

Add this rule:
- Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
- Target: `/index.html`
- Type: `200 (Rewrite)`

### 4.4 Deploy

Click **Save and deploy**. Amplify will clone the repo, build the frontend, and deploy to its CDN.

---

## Step 5: Update CORS Configuration

Update the backend's `FRONTEND_URL` environment variable to the Amplify URL (comma-separate multiple origins, e.g. a custom domain plus the default `*.amplifyapp.com` URL — the backend splits on `,`). App Runner redeploys automatically when you update environment variables.

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

1. RDS is private — it will not accept connections from outside the VPC. To inspect it manually, connect from something inside the VPC (e.g. `psql` via an EC2 bastion or SSM port-forward in the same VPC), not from your laptop directly.
2. Verify the RDS security group allows the App Runner VPC connector's security group on 5432.
3. Verify the `DATABASE_URL` secret is correctly formatted.
4. Check `/health` — it reports `"database": "connected"` or `"disconnected"` explicitly.

### App Runner Deployment Failures

1. Check build logs in App Runner console (and the GitHub Actions run, since the image build happens there, not in App Runner)
2. Verify all secrets are accessible (the App Runner instance role needs `secretsmanager:GetSecretValue` on each)
3. Ensure `requirements.txt` includes all dependencies

```bash
aws logs tail /aws/apprunner/metricflow-backend/service --follow
```

### Amplify Build Failures

1. Check build logs in Amplify console
2. Verify `amplify.yml` syntax
3. Ensure environment variables are set

### CORS Errors

1. Verify `FRONTEND_URL` matches the Amplify URL exactly (including `https://`)
2. Check browser console for specific CORS error messages
3. Verify App Runner deployed with updated configuration

---

## Cost Estimation

| Service | Estimated Monthly Cost |
|---------|----------------------|
| RDS db.t3.micro | ~$15-25 |
| App Runner (1 vCPU, 2GB) | ~$25-50 |
| NAT Gateway | ~$32+ (plus data processing) |
| Amplify Hosting | ~$5-15 |
| Secrets Manager (7 secrets) | ~$3 |
| Data Transfer | Variable |
| **Total** | **~$80-125/month** |

*Costs vary based on usage. Use AWS Calculator for accurate estimates.*

---

## Security Checklist

- [x] RDS not publicly accessible (private subnets, security group scoped to the App Runner VPC connector only)
- [x] RDS encryption enabled
- [x] Secrets stored in Secrets Manager (`DATABASE_URL`, `SECRET_KEY`, `ENCRYPTION_KEY`, `GEMINI_API_KEY`, Razorpay keys)
- [x] App Runner uses HTTPS only
- [x] CORS restricted to frontend domain(s)
- [x] Migrations run under an advisory lock, fail the boot loudly on error
- [ ] RDS master password migrated to `--manage-master-user-password` (existing instances created with an inline password need one manual rotation to pick this up)
- [ ] CloudWatch alarms configured
- [ ] Regular backups enabled for RDS (`--backup-retention-period` is set; verify actual restore works, not just that backups exist)

---

## CI/CD Pipeline

- **Backend**: push to `main` → GitHub Actions builds `backend/Dockerfile`, pushes to ECR → App Runner auto-deploys the new `:latest` image (`AutoDeploymentsEnabled: true`). App Runner's `apprunner.yaml`-based "build from source" mode is **not** used — there is no `apprunner.yaml` in this repo.
- **Frontend**: push to `main` → Amplify detects the change → rebuilds and deploys.
