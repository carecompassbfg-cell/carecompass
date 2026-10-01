from dotenv import load_dotenv
load_dotenv() # Omit file path to let dotenv search for .env files automatically

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import router
from app.core.privacy import event_scrubber, scrub_personal_data
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for tracing.
    traces_sample_rate=1.0,
    # Keep the care recipient's name and scheme answers out of error reports
    before_send=scrub_personal_data,
    event_scrubber=event_scrubber,
    _experiments={
        # Set continuous_profiling_auto_start to True
        # to automatically start the profiler on when
        # possible.
        "continuous_profiling_auto_start": True,
    },
)

app = FastAPI(
    title="CareCompass API",
)

# Authentication is handled via dependency injection in each route

# TODO: use env variables
origins = [
    "http://localhost:3000",
    "https://my.carecompass.sg",
    "https://prod-frontend.carecompass.sg",
    "https://staging-frontend.carecompass.sg",
    "https://staging.carecompass.sg",
    "https://carecompass-bfg.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    # Specific methods instead of wildcard
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Specific headers instead of wildcard
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
    ],
)

app.include_router(router)

# Exception handler for all uncaught exceptions
async def base_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
        },
    )

app.add_exception_handler(Exception, base_exception_handler)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Enhanced root endpoint
@app.get("/")
async def root():
    return {"message": "CareCompass API", "version": "1.0.0"}