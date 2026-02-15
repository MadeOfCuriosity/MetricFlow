# MetricFlow

A full-stack SaaS application for business KPI tracking with AI-powered insights.

## Features

- **Multi-tenant Architecture**: Organizations with isolated data
- **KPI Management**: Create custom KPIs with flexible formulas
- **Data Entry**: Daily metric tracking with auto-calculation
- **AI Insights**: Automated trend analysis, anomaly detection, and recommendations
- **AI KPI Builder**: Conversational interface to create custom KPIs (powered by Google Vertex AI)
- **Dark Theme UI**: Modern, responsive dashboard

## Tech Stack

### Backend
- **FastAPI** - High-performance Python API framework
- **PostgreSQL** - Reliable relational database
- **SQLAlchemy** - ORM with Alembic migrations
- **JWT Authentication** - Secure token-based auth
- **Google Vertex AI** - Gemini 2.0 Flash for AI features

### Frontend
- **React 18** - UI library with TypeScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **React Router** - Client-side routing

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start all services
git clone <repo-url>
cd MetricFlow

# Start PostgreSQL, backend, and frontend
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Seed demo data (optional)
docker-compose exec backend python -m scripts.seed_demo_data
```

Access the app at http://localhost:5173

### Option 2: Local Development

#### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Seed demo data (optional)
python -m scripts.seed_demo_data

# Start server
uvicorn main:app --reload
```

Backend runs at http://localhost:8000

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

Frontend runs at http://localhost:5173

## Demo Credentials

After running the seed script:
- **Email**: demo@metricflow.io
- **Password**: demo123

## API Documentation

Once the backend is running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
MetricFlow/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Config, security, exceptions
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   ├── alembic/           # Database migrations
│   ├── scripts/           # Utility scripts
│   └── tests/             # Backend tests
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   └── services/      # API client
│   └── tests/             # Frontend tests
└── docker-compose.yml
```

## Environment Variables

### Backend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | - |
| SECRET_KEY | JWT signing key (min 32 chars) | - |
| FRONTEND_URL | CORS origin | http://localhost:5173 |
| GOOGLE_CLOUD_PROJECT | GCP project for Vertex AI | (optional) |
| AI_RATE_LIMIT_PER_DAY | AI requests per org/day | 50 |

### Frontend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:8000 |
| VITE_APP_NAME | App display name | MetricFlow |

## Running Tests

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register-org | Register new organization |
| POST | /api/auth/login | User login |
| GET | /api/kpis | List KPIs |
| POST | /api/kpis | Create KPI |
| POST | /api/entries | Submit data entry |
| GET | /api/entries/today | Get today's form |
| GET | /api/insights | Get insights |
| POST | /api/ai/kpi-builder | AI conversation |

## AI Features

The AI KPI Builder uses Google Vertex AI (Gemini 2.0 Flash) for:
- Natural language KPI creation
- Formula suggestions based on industry standards
- Input field recommendations

To enable:
1. Create a GCP project
2. Enable Vertex AI API
3. Set up service account credentials
4. Configure `GOOGLE_CLOUD_PROJECT` in .env

Without GCP credentials, the system uses mock responses for development.

## License

MIT
