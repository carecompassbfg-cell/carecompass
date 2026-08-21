# FastAPI Backend

## Setup

### Environment variables

```bash
cp .env.template .env
```

Configure `.env`. In particular:
- `OPENAI_API_KEY` and `OPENAI_MODEL`: Production configs are stored in AWS Secrets Manager (boto3 automation not set up yet).
- **Database:** See `Database` section for the values to use for local dev.

### Dependencies

```bash
pipenv install
pipenv shell
```

### Database

#### Docker Compose (recommended)

```bash
docker-compose -f _local/db/docker-compose.yml up -d
```

This starts a PostgreSQL 15 container. Add these to your `.env`:

| Variable     | Value        |
| ------------ | ------------ |
| `DB_USER`    | `postgres`   |
| `DB_PASSWORD`| `postgres`   |
| `DB_HOST`    | `localhost`  |
| `DB_PORT`    | `5432`       |
| `DB_NAME`    | `postgres`   |
| `DB_SSLMODE` | `disable`    |

#### Migrations

The project uses Alembic; migration files live in `app/migrations/versions`. After the DB is running:

- **Up:** `alembic upgrade head`
- **Down:** `alembic downgrade <step>`
- **Autogenerate:** `alembic revision --autogenerate -m <migration-name>`

Alembic does not handle enums well: it does not drop enum types on downgrade and does not update enums when new values are added.

#### Seeding (optional)

To seed sample data locally, run `python _local/db/seed/seed.py`. See `_local/db/seed/README.md` for details.

## Run

```bash
fastapi dev app/main.py
```

## Deployment

The project uses GitHub Actions for CI/CD.

### CI workflow

- Runs on pull requests, on pushes to `main` when `backend/**` changes, or on manual trigger via `workflow_dispatch`.
- Builds and pushes Docker images to the registry.
- See `.github/workflows/backend-ci.yml` for more details.

### CD workflow

- Runs on manual trigger via `workflow_dispatch`.
- Deploys the Docker image to the target server.
- Runs database migrations before starting the new container.
- See `.github/workflows/backend-cd.yml` for more details.

### Required GitHub configuration

**Secrets**
- `DEPLOY_HOST`: Deployment server hostname or IP.
- `DEPLOY_USER`: SSH username on the deployment server.
- `DEPLOY_SSH_KEY`: SSH private key for the deployment server.
- `DEPLOY_PORT`: SSH port (optional; default 22).
