# CareCompass

**Empowering Caregivers with Simple, Accessible Support.**

## Team:
- Isaiah Tan, UX Designer
- Joshua Gei, Data Scientist/Product Manager
- Justin Noah Chua, UX Designer
- Ming Jun Zhang, Developer
- Natalie Yu, Product Manager/Data Analyst
- Nalongsak Luangkhot, Developer
- Alif Daffa' Yusof, Developer

## Problem Statement
Caregivers of elderly with dementia need to search for and sift through multiple sources of information to make good care decisions when their loved ones require informal care. This results in a disproportionate amount of stress and time spent searching for and evaluating information because there is no single source of trusted, curated advice on next steps they should take for their care recipient’s needs.

## Proposed Solution
We aim to develop a centralised platform with a conversational chat interface that takes in user input about the needs of their care recipients and pulls resources from trusted websites (e.g. DementiaSG, Agency for Integrated Care) that are regularly maintained. The output would be a set of personalised, step by step recommendations to help caregivers formulate their care plans. The chat interface would provide an alternative search experience that is like talking to a trusted friend instead of clicking through websites. The personalisation and organisation of plans would also help overcome the genericity of current online information, increasing the utility of outputs.

## Impact
- Reduction in time caregivers spend searching for information (and hence working hours saved, $ saved)
- Reduction in stress in the search experience
- Additional resource for clinics / social workers to better help patients and caregivers
- Increase visibility and adoption of resources for community partners

## Getting Started

### Prerequisites
- Docker Desktop
- Node.js 18+
- Python 3.9+
- pipenv
- make

### Quick Start (Recommended)
Run the development script to start all services:
```bash
make dev
```

This will:
1. Start PostgreSQL via Docker
2. Run database migrations
3. Seed sample data
4. Start the backend server (http://127.0.0.1:8000)
5. Start the frontend server (http://localhost:3000)

Use `make help` or `make dev-detach` for more options.

### Manual Setup

#### Backend
```bash
cd backend
pipenv install
pipenv shell
docker-compose -f _local/db/docker-compose.yml up -d
alembic upgrade head
python _local/db/seed/seed.py
fastapi dev app/main.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
