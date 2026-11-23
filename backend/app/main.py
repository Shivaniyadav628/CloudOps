
import time
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.aws.cloudwatch import get_ec2_cpu_metrics
from app.aws.ec2 import get_ec2_instances

from app.services.system_monitor import get_system_metrics
from app.services.incident_detector import detect_incidents

from app.services.database import (
    DB_PATH,
    save_incidents,
    get_incident_history,
    get_incident_by_id,
    update_incident_status,
    get_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
)

from app.services.process_analyzer import get_top_processes
from app.services.incident_analyzer import analyze_incident
from app.services.disk_analyzer import analyze_disk_space
from app.services.logger import app_logger


# --------------------------------------------------
# REQUEST SCHEMA
# --------------------------------------------------

class IncidentStatusUpdate(BaseModel):
    status: Literal["Open", "Acknowledged", "Resolved"]


# --------------------------------------------------
# APPLICATION LIFESPAN
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):

    app_logger.info("CloudOps Monitoring API started successfully")

    yield

    app_logger.info("CloudOps Monitoring API shutting down")


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="CloudOps Monitoring API",
    description="System monitoring and automated incident detection",
    version="1.1.0",
    lifespan=lifespan,
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://cloudops-frontend-ahhh.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# REQUEST LOGGING MIDDLEWARE
# --------------------------------------------------

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):

    start_time = time.perf_counter()

    app_logger.info(
        "Incoming request: %s %s",
        request.method,
        request.url.path,
    )

    try:

        response = await call_next(request)

        process_time = round(
            time.perf_counter() - start_time,
            4,
        )

        app_logger.info(
            "Request completed: %s %s | Status: %s | Duration: %s seconds",
            request.method,
            request.url.path,
            response.status_code,
            process_time,
        )

        return response

    except Exception:

        app_logger.exception(
            "Request failed: %s %s",
            request.method,
            request.url.path,
        )

        raise


# --------------------------------------------------
# GLOBAL ERROR HANDLER
# --------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):

    app_logger.error(
        "Unhandled application error on %s %s",
        request.method,
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Check CloudOps logs.",
        },
    )


# --------------------------------------------------
# HOME ENDPOINT
# --------------------------------------------------

@app.get("/")
def home():

    app_logger.info("Home endpoint accessed")

    return {
        "message": "CloudOps API is running",
        "status": "Healthy",
    }


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health_check():

    return {
        "status": "Healthy",
        "service": "CloudOps Monitoring API",
    }


# --------------------------------------------------
# SYSTEM METRICS
# --------------------------------------------------

@app.get("/metrics")
def system_metrics():

    try:

        metrics = get_system_metrics()

        app_logger.info("System metrics collected successfully")

        return metrics

    except Exception:

        app_logger.exception("Failed to collect system metrics")

        raise


# --------------------------------------------------
# INCIDENT DETECTION
# --------------------------------------------------

@app.get("/incidents")
def get_incidents():

    try:

        metrics = get_system_metrics()

        result = detect_incidents(metrics)

        save_incidents(result["incidents"])

        app_logger.info(
            "Incident detection completed. Total incidents: %s",
            result["total_incidents"],
        )

        return result

    except Exception:

        app_logger.exception("Incident detection failed")

        raise


# --------------------------------------------------
# INCIDENT HISTORY
# --------------------------------------------------

@app.get("/incidents/history")
def incident_history(
    limit: int = Query(default=50, ge=1, le=500)
):

    try:

        history = get_incident_history(limit)

        app_logger.info(
            "Retrieved %s incident history records",
            len(history),
        )

        return {
            "total_records": len(history),
            "history": history,
        }

    except Exception:

        app_logger.exception("Failed to retrieve incident history")

        raise


# --------------------------------------------------
# NOTIFICATION CENTER
# --------------------------------------------------

@app.get("/notifications")
def notification_center(
    limit: int = Query(default=50, ge=1, le=200)
):

    try:

        result = get_notifications(limit)

        app_logger.info(
            "Retrieved %s notifications. Unread: %s",
            result["total_notifications"],
            result["unread_count"],
        )

        return result

    except Exception:

        app_logger.exception("Failed to retrieve notifications")

        raise


# --------------------------------------------------
# MARK ONE NOTIFICATION AS READ
# --------------------------------------------------

@app.patch("/notifications/{notification_id}/read")
def read_notification(notification_id: int):

    try:

        updated = mark_notification_as_read(notification_id)

        if not updated:

            raise HTTPException(
                status_code=404,
                detail="Notification not found.",
            )

        app_logger.info(
            "Notification %s marked as read",
            notification_id,
        )

        return {
            "message": "Notification marked as read",
            "notification_id": notification_id,
        }

    except HTTPException:

        raise

    except Exception:

        app_logger.exception(
            "Failed to mark notification %s as read",
            notification_id,
        )

        raise


# --------------------------------------------------
# MARK ALL NOTIFICATIONS AS READ
# --------------------------------------------------

@app.post("/notifications/read-all")
def read_all_notifications():

    try:

        updated_count = mark_all_notifications_as_read()

        app_logger.info(
            "Marked %s notifications as read",
            updated_count,
        )

        return {
            "message": "All notifications marked as read",
            "updated_count": updated_count,
        }

    except Exception:

        app_logger.exception("Failed to mark all notifications as read")

        raise


# --------------------------------------------------
# UPDATE INCIDENT STATUS
# --------------------------------------------------

@app.patch("/incidents/{incident_id}/status")
def change_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
):

    try:

        updated = update_incident_status(
            incident_id,
            payload.status,
        )

        if not updated:

            raise HTTPException(
                status_code=404,
                detail=f"Incident with ID {incident_id} not found.",
            )

        incident = get_incident_by_id(incident_id)

        if incident is None:

            raise HTTPException(
                status_code=500,
                detail="Incident was updated but could not be retrieved.",
            )

        if incident["status"] != payload.status:

            app_logger.error(
                "Incident status verification failed. ID: %s, Expected: %s, Actual: %s",
                incident_id,
                payload.status,
                incident["status"],
            )

            raise HTTPException(
                status_code=500,
                detail="Incident status update verification failed.",
            )

        app_logger.info(
            "Incident retrieved after update: %s",
            incident,
        )

        app_logger.info(
            "Incident %s status successfully changed to %s",
            incident_id,
            payload.status,
        )

        return {
            "message": "Incident status updated successfully",
            "incident": incident,
        }

    except HTTPException:

        raise

    except Exception:

        app_logger.exception(
            "Failed to update incident %s",
            incident_id,
        )

        raise


# --------------------------------------------------
# TOP PROCESSES
# --------------------------------------------------

@app.get("/processes/top")
def top_processes(
    limit: int = Query(default=10, ge=1, le=50)
):

    try:

        processes = get_top_processes(limit)

        app_logger.info(
            "Process analysis completed. Processes scanned: %s",
            processes["total_processes"],
        )

        return processes

    except Exception:

        app_logger.exception("Process analysis failed")

        raise


# --------------------------------------------------
# RESOURCE-SPECIFIC INCIDENT INVESTIGATION
# --------------------------------------------------

@app.get("/incidents/analyze")
def analyze_current_incidents(
    resource: str | None = Query(
        default=None,
        description="Optional resource to investigate: CPU, Memory, or Disk",
    )
):

    try:

        selected_resource = None

        if resource is not None:

            selected_resource = resource.strip().lower()

            if selected_resource not in ["cpu", "memory", "disk"]:

                raise HTTPException(
                    status_code=422,
                    detail="Resource must be CPU, Memory, or Disk.",
                )

        metrics = get_system_metrics()

        detected = detect_incidents(metrics)

        analyses = []

        for incident in detected["incidents"]:

            incident_resource = incident["resource"].strip().lower()

            if (
                selected_resource is not None
                and incident_resource != selected_resource
            ):
                continue

            if incident_resource == "disk":

                if selected_resource != "disk":

                    analysis = {
                        "resource": "disk",
                        "status": "not_analyzed",
                        "message": (
                            "Disk investigation was skipped to avoid "
                            "an unnecessary full disk scan. Select Disk "
                            "to investigate storage usage."
                        ),
                    }

                else:

                    app_logger.info(
                        "Starting disk investigation for selected incident"
                    )

                    analysis = analyze_disk_space()

            else:

                app_logger.info(
                    "Starting %s investigation",
                    incident_resource,
                )

                analysis = analyze_incident(
                    incident_resource,
                    incident["usage_percent"],
                )

            analyses.append({
                "incident": incident,
                "analysis": analysis,
            })

        app_logger.info(
            "Resource-specific investigation completed. "
            "Requested resource: %s | Results: %s",
            selected_resource or "CPU and Memory (Disk skipped)",
            len(analyses),
        )

        return {
            "total_incidents": len(analyses),
            "requested_resource": selected_resource,
            "analyses": analyses,
        }

    except HTTPException:

        raise

    except Exception:

        app_logger.exception(
            "Resource-specific incident investigation failed"
        )

        raise


# --------------------------------------------------
# DATABASE DEBUG ENDPOINT
# --------------------------------------------------

@app.get("/debug/database")
def debug_database():

    return {
        "database_path": str(DB_PATH),
        "database_exists": DB_PATH.exists(),
    }


# --------------------------------------------------
# AWS EC2 CLOUDWATCH CPU METRICS
# --------------------------------------------------

@app.get("/aws/ec2/cpu")
def aws_ec2_cpu_metrics(
    instance_id: str = Query(
        ...,
        min_length=10,
        max_length=20,
        pattern=r"^i-[0-9a-fA-F]+$",
    )
):

    try:

        metrics = get_ec2_cpu_metrics(instance_id)

        app_logger.info(
            "CloudWatch CPU metrics retrieved for EC2 instance: %s",
            instance_id,
        )

        return {
            "status": "success",
            "cloud_provider": "AWS",
            "data": metrics,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=422,
            detail=str(exc),
        )

    except RuntimeError as exc:

        app_logger.error(
            "CloudWatch request failed for instance %s: %s",
            instance_id,
            exc,
        )

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )

    except Exception:

        app_logger.exception(
            "Unexpected error retrieving CloudWatch metrics for %s",
            instance_id,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve AWS metrics.",
        )


# --------------------------------------------------
# AWS EC2 INSTANCE DISCOVERY
# --------------------------------------------------

@app.get("/aws/ec2/instances")
def aws_ec2_instances():

    try:

        result = get_ec2_instances()

        app_logger.info(
            "EC2 instance discovery completed. Total instances: %s",
            result["total_instances"],
        )

        return {
            "status": "success",
            "cloud_provider": "AWS",
            "data": result,
        }

    except RuntimeError as exc:

        app_logger.error(
            "AWS EC2 instance discovery failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )

    except Exception:

        app_logger.exception(
            "Unexpected error during EC2 instance discovery"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve AWS EC2 instances.",
        )
