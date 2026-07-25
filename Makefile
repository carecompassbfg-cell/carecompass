# CareCompass — local dev shortcuts
#
# Usage:
#   make dev [SEED=0|1]     Start DB (migrate + optional seed), then backend + frontend
#                           attached. Ctrl-C tears down frontend, backend, and DB.
#   make db-up [SEED=0|1]   Start Postgres, run migrations, optionally seed
#   make db-down            Stop Postgres
#
# SEED defaults to 1 (seed the DB). Pass SEED=0 to skip seeding, e.g. `make dev SEED=0`.

# Recipes that need shared shell state (variables, traps, background jobs) are
# written as a single logical line with `\` continuations, so they run in ONE
# shell without relying on `.ONESHELL:` — that directive requires GNU Make >= 3.82
# and is silently ignored by the GNU Make 3.81 that ships with macOS.
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

# --- Paths (this Makefile lives at the repo root) ---
BACKEND_DIR  := backend
FRONTEND_DIR := frontend
# COMPOSE_FILE is relative to BACKEND_DIR (we cd there before invoking compose).
COMPOSE_FILE := _local/db/docker-compose.yml
DB_CONTAINER := carecompass-db

# Prefer Docker Compose v2 (`docker compose`), fall back to legacy `docker-compose`.
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Seed the DB after migrations? 1 = yes (default), 0 = no.
SEED ?= 1

.PHONY: help db-up db-down dev

help:
	@echo "CareCompass local dev"
	@echo ""
	@echo "  make dev [SEED=0|1]     DB up + migrate (+seed) then run backend + frontend; Ctrl-C stops all"
	@echo "  make db-up [SEED=0|1]   Start Postgres, run migrations (+seed)"
	@echo "  make db-down            Stop Postgres"
	@echo ""
	@echo "  SEED defaults to 1. Pass SEED=0 to skip seeding (e.g. make dev SEED=0)."

# Start Postgres, wait until healthy, run migrations, and optionally seed.
db-up:
	@echo "[make] Starting Postgres ($(DB_CONTAINER))…"; \
	cd $(BACKEND_DIR); \
	$(COMPOSE) -f $(COMPOSE_FILE) up -d; \
	echo "[make] Waiting for Postgres healthcheck…"; \
	attempts=0; \
	while true; do \
	  status="$$( docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' $(DB_CONTAINER) 2>/dev/null || true )"; \
	  if [ "$$status" = "healthy" ]; then \
	    echo "[make] Postgres is healthy."; \
	    break; \
	  fi; \
	  if [ "$$status" = "unhealthy" ]; then \
	    echo "[make] Postgres is unhealthy — check: docker logs $(DB_CONTAINER)" >&2; \
	    exit 1; \
	  fi; \
	  attempts=$$(( attempts + 1 )); \
	  if [ "$$attempts" -ge 60 ]; then \
	    echo "[make] Timed out waiting for Postgres to become healthy." >&2; \
	    exit 1; \
	  fi; \
	  sleep 2; \
	done; \
	echo "[make] Running Alembic migrations…"; \
	pipenv run alembic upgrade head; \
	if [ "$(SEED)" = "1" ]; then \
	  echo "[make] Seeding database…"; \
	  pipenv run python _local/db/seed/seed.py; \
	else \
	  echo "[make] Skipping seed (SEED=$(SEED))."; \
	fi; \
	echo "[make] DB ready."

# Stop Postgres.
db-down:
	@echo "[make] Stopping Postgres ($(DB_CONTAINER))…"; \
	cd $(BACKEND_DIR); \
	$(COMPOSE) -f $(COMPOSE_FILE) down; \
	echo "[make] Postgres stopped."

# Bring up the DB (via db-up), then run backend + frontend attached.
# Ctrl-C tears down frontend, backend, and the DB.
dev: db-up
	@echo "[make] Starting backend + frontend — press Ctrl-C to stop everything."; \
	set -m; \
	BACKEND_PID=""; \
	FRONTEND_PID=""; \
	cleanup() { \
	  trap - INT TERM EXIT; \
	  echo ""; \
	  echo "[make] Shutting down…"; \
	  [ -n "$$FRONTEND_PID" ] && kill -TERM -"$$FRONTEND_PID" 2>/dev/null || true; \
	  [ -n "$$BACKEND_PID" ]  && kill -TERM -"$$BACKEND_PID"  2>/dev/null || true; \
	  ( cd $(BACKEND_DIR) && $(COMPOSE) -f $(COMPOSE_FILE) down ) || true; \
	  echo "[make] All services stopped."; \
	}; \
	trap cleanup INT TERM EXIT; \
	( cd $(BACKEND_DIR)  && pipenv run fastapi dev app/main.py ) & \
	BACKEND_PID=$$!; \
	( cd $(FRONTEND_DIR) && npm run dev ) & \
	FRONTEND_PID=$$!; \
	wait
