# CareCompass Development Guide

This file contains essential information for agentic coding agents working on the CareCompass codebase.

## Project Structure

CareCompass is a full-stack application consisting of:
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, Chakra UI
- **Backend**: FastAPI with Python 3.9, SQLAlchemy, PostgreSQL
- **Authentication**: Clerk (frontend) with custom user management
- **State Management**: Zustand with immer middleware
- **Database**: PostgreSQL with Alembic migrations

## Build and Development Commands

### Frontend (in `frontend/` directory)
```bash
# Development
npm run dev              # Start development server on localhost:3000

# Building
npm run build            # Build production application
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Run Prettier to format code
```

### Backend (in `backend/` directory)
```bash
# Environment Setup
pipenv install           # Install dependencies
pipenv shell            # Activate virtual environment

# Development
fastapi dev app/main.py # Start development server on localhost:8000
fastapi run app/main.py # Start production server

# Database
docker-compose -f _local/db/docker-compose.yml up -d  # Start PostgreSQL
alembic upgrade head                                   # Run migrations
alembic revision --autogenerate -m "<migration-name>" # Create migration
alembic downgrade <step>                              # Rollback migration

# Seeding
python _local/db/seed/seed.py  # Load sample data (after migrations)
```

### Testing
No test framework is currently configured. When adding tests, prefer Vitest for frontend and pytest for backend.

## Code Style Guidelines

### Frontend (TypeScript/React)

#### Imports
- Use absolute imports with `@/` prefix for internal modules
- Group imports: React → external libraries → internal utilities → components
```typescript
import React from "react";
import { create } from "zustand";
import { Button } from "@chakra-ui/react";
import { UserData } from "@/types/user";
import { useAuthStore } from "@/stores/auth";
```

#### Naming Conventions
- **Components**: PascalCase (`ProviderCard.tsx`)
- **Files**: PascalCase for components, camelCase for utilities (`useAuthStore.ts`)
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase with descriptive names (`UserDataBase`)

#### TypeScript
- Use strict mode (already configured in tsconfig.json)
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use explicit return types for public APIs
- Leverage enum types for domain constants (import from backend)

#### React Patterns
- Use functional components with hooks
- Prefer custom hooks for complex logic separation
- Use Zustand for global state with immer middleware
- Follow Next.js App Router conventions for routing
- Use Server Components where possible, Client Components only when needed

#### Styling
- Primary: Tailwind CSS classes
- Secondary: Chakra UI components
- Use responsive design with mobile-first approach
- Follow the existing design system patterns

### Backend (Python/FastAPI)

#### Imports
- Standard library → third-party → local imports
- Use absolute imports from app root
```python
import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy import Column, Integer, String

from app.core.database import db_dependency
from app.models import User
```

#### Naming Conventions
- **Classes**: PascalCase (`User`, `UserBase`)
- **Functions/Variables**: snake_case
- **Constants**: UPPER_SNAKE_CASE
- **Files**: snake_case (`user.py`, `dementia_daycare.py`)

#### Type Hints
- Use type hints for all function parameters and return values
- Use Pydantic models for request/response validation
- Leverage SQLAlchemy models for database entities

#### API Design
- Use FastAPI dependency injection for database sessions
- Follow RESTful conventions for endpoints
- Use Pydantic models with proper alias generation (camelCase for JSON)
- Implement proper HTTP status codes and error handling

#### Database
- Use SQLAlchemy ORM with declarative models
- Define enums as Python classes for type safety
- Use Alembic for all schema changes
- Implement proper relationships with back_populates

## Environment Configuration

### Frontend Environment Variables
- Copy `.env.template` to `.env.local` for local development
- Use Next.js built-in environment variable handling

### Backend Environment Variables
- Copy `.env.template` to `.env`
- Required variables: `OPENAI_API_KEY`, `OPENAI_MODEL`, database credentials
- Use `python-dotenv` for local development

## Error Handling

### Frontend
- Use try-catch blocks for async operations
- Implement proper loading states and error boundaries
- Use toast notifications (Sonner) for user feedback
- Handle network errors gracefully with retry logic

### Backend
- Use FastAPI exception handlers for consistent error responses
- Implement proper logging with structured data
- Use Sentry for error tracking (already configured)
- Return appropriate HTTP status codes with meaningful messages

## Security Considerations

- Never commit secrets or API keys
- Use environment variables for all sensitive data
- Implement proper CORS configuration (currently permissive, should be tightened)
- Use SQLAlchemy encrypted fields for sensitive user data
- Validate all inputs with Pydantic models
- Implement proper authentication and authorization

## Development Workflow

1. **Frontend Changes**: Run `npm run lint` and `npm run format` before committing
2. **Backend Changes**: Ensure migrations are properly named and tested
3. **Database Changes**: Always create migration files, never modify schema directly
4. **New Features**: Follow existing patterns and maintain consistency
5. **Code Reviews**: Focus on type safety, error handling, and maintainability

## Key Dependencies and Their Purpose

### Frontend
- **Next.js**: React framework with App Router
- **Chakra UI**: Component library for consistent design
- **Zustand**: Lightweight state management
- **Clerk**: Authentication and user management
- **Tailwind CSS**: Utility-first CSS framework

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migration tool
- **Pydantic**: Data validation and serialization
- **OpenAI**: AI integration for chat functionality

## Common Patterns

### API Response Models
```python
class UserResponse(UserBase):
    id: int
    threads: List[ThreadReadResponse] = []
```

### Frontend API Calls
```typescript
const response = await api.post('/users', userData);
// Handle response with proper error checking
```

### State Management
```typescript
export const useAuthStore = create<AuthState & AuthActions>()(
  immer((set) => ({
    // state and actions
  })),
);
```

This guide should be updated as the codebase evolves. Always follow existing patterns unless there's a compelling reason to diverge.