
from fastapi.testclient import TestClient

import app.main as main
from app.main import app

client = TestClient(app)


# --------------------------------------------------
# EXISTING API TESTS
# --------------------------------------------------

def test_home_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "Healthy"


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "Healthy"


def test_metrics_endpoint(monkeypatch):
    mock_metrics = {
        "cpu": {"usage_percent": 30},
        "memory": {"usage_percent": 50},
        "disk": {"usage_percent": 60}
    }

    monkeypatch.setattr(
        main,
        "get_system_metrics",
        lambda: mock_metrics
    )

    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.json()["cpu"]["usage_percent"] == 30


def test_incidents_endpoint(monkeypatch):
    mock_incidents = {
        "total_incidents": 1,
        "incidents": [
            {
                "resource": "CPU",
                "usage_percent": 95,
                "severity": "Critical",
                "message": "CPU usage is high.",
                "recommendation": "Investigate CPU processes."
            }
        ]
    }

    monkeypatch.setattr(
        main,
        "get_system_metrics",
        lambda: {}
    )

    monkeypatch.setattr(
        main,
        "detect_incidents",
        lambda metrics: mock_incidents
    )

    saved = []

    monkeypatch.setattr(
        main,
        "save_incidents",
        lambda incidents: saved.extend(incidents)
    )

    response = client.get("/incidents")

    assert response.status_code == 200
    assert response.json()["total_incidents"] == 1
    assert len(saved) == 1


def test_incident_history_endpoint(monkeypatch):
    mock_history = [
        {
            "id": 1,
            "resource": "Memory",
            "usage_percent": 85,
            "severity": "Warning"
        }
    ]

    monkeypatch.setattr(
        main,
        "get_incident_history",
        lambda limit: mock_history
    )

    response = client.get("/incidents/history")

    assert response.status_code == 200
    assert response.json()["total_records"] == 1


def test_processes_endpoint(monkeypatch):
    mock_processes = {
        "total_processes": 1,
        "top_cpu_processes": [
            {
                "pid": 1234,
                "name": "python.exe",
                "cpu_percent": 50
            }
        ],
        "top_memory_processes": []
    }

    monkeypatch.setattr(
        main,
        "get_top_processes",
        lambda limit: mock_processes
    )

    response = client.get("/processes/top")

    assert response.status_code == 200
    assert response.json()["total_processes"] == 1


# --------------------------------------------------
# INCIDENT ANALYSIS TESTS
# --------------------------------------------------

def test_incident_analysis_endpoint(monkeypatch):
    mock_incidents = [
        {
            "resource": "CPU",
            "usage_percent": 95,
            "severity": "Critical",
            "message": "CPU usage is high.",
            "recommendation": "Investigate CPU."
        },
        {
            "resource": "Disk",
            "usage_percent": 94,
            "severity": "Critical",
            "message": "Disk usage is high.",
            "recommendation": "Inspect disk."
        }
    ]

    monkeypatch.setattr(
        main,
        "get_system_metrics",
        lambda: {}
    )

    monkeypatch.setattr(
        main,
        "detect_incidents",
        lambda metrics: {
            "total_incidents": len(mock_incidents),
            "incidents": mock_incidents
        }
    )

    monkeypatch.setattr(
        main,
        "analyze_incident",
        lambda resource, usage: {
            "resource": resource,
            "system_usage_percent": usage,
            "recommendation": "Investigate top process."
        }
    )

    monkeypatch.setattr(
        main,
        "analyze_disk_space",
        lambda: {
            "total_files_scanned": 100,
            "total_scanned_size": "2 GB",
            "largest_files": [],
            "largest_directories": [],
            "recommendations": []
        }
    )

    # Explicitly request Disk analysis.
    response = client.get(
        "/incidents/analyze?resource=Disk"
    )

    assert response.status_code == 200

    data = response.json()

    # The API investigates only the requested resource.
    assert data["total_incidents"] == 1
    assert len(data["analyses"]) == 1

    disk_analysis = data["analyses"][0]

    assert disk_analysis["incident"]["resource"] == "Disk"
    assert disk_analysis["analysis"]["total_files_scanned"] == 100


def test_cpu_analysis_skips_disk_scan(monkeypatch):
    mock_incidents = [
        {
            "resource": "CPU",
            "usage_percent": 95,
            "severity": "Critical",
            "message": "CPU usage is high.",
            "recommendation": "Investigate CPU."
        }
    ]

    monkeypatch.setattr(
        main,
        "get_system_metrics",
        lambda: {}
    )

    monkeypatch.setattr(
        main,
        "detect_incidents",
        lambda metrics: {
            "total_incidents": 1,
            "incidents": mock_incidents
        }
    )

    monkeypatch.setattr(
        main,
        "analyze_incident",
        lambda resource, usage: {
            "resource": resource,
            "system_usage_percent": usage,
            "recommendation": "Investigate CPU processes."
        }
    )

    disk_called = []

    def fake_disk_analysis():
        disk_called.append(True)
        return {"total_files_scanned": 100}

    monkeypatch.setattr(
        main,
        "analyze_disk_space",
        fake_disk_analysis
    )

    response = client.get(
        "/incidents/analyze?resource=CPU"
    )

    assert response.status_code == 200
    assert disk_called == []


# --------------------------------------------------
# VALIDATION TESTS
# --------------------------------------------------

def test_invalid_history_limit():
    response = client.get(
        "/incidents/history?limit=1000"
    )

    assert response.status_code == 422


def test_invalid_process_limit():
    response = client.get(
        "/processes/top?limit=100"
    )

    assert response.status_code == 422


# --------------------------------------------------
# NOTIFICATION CENTER TESTS
# --------------------------------------------------

def test_notifications_endpoint(monkeypatch):
    mock_notifications = {
        "total_notifications": 1,
        "unread_count": 1,
        "notifications": [
            {
                "id": 1,
                "incident_id": 10,
                "resource": "CPU",
                "title": "Critical CPU Incident",
                "message": "CPU usage reached 95%.",
                "severity": "Critical",
                "created_at": "2026-11-20T10:00:00",
                "is_read": 0
            }
        ]
    }

    monkeypatch.setattr(
        main,
        "get_notifications",
        lambda limit: mock_notifications
    )

    response = client.get("/notifications")

    assert response.status_code == 200

    data = response.json()

    assert data["total_notifications"] == 1
    assert data["unread_count"] == 1
    assert data["notifications"][0]["resource"] == "CPU"


def test_mark_notification_as_read(monkeypatch):
    monkeypatch.setattr(
        main,
        "mark_notification_as_read",
        lambda notification_id: notification_id == 1
    )

    response = client.patch(
        "/notifications/1/read"
    )

    assert response.status_code == 200


def test_mark_nonexistent_notification_as_read(monkeypatch):
    monkeypatch.setattr(
        main,
        "mark_notification_as_read",
        lambda notification_id: False
    )

    response = client.patch(
        "/notifications/999/read"
    )

    assert response.status_code == 404


def test_mark_all_notifications_as_read(monkeypatch):
    monkeypatch.setattr(
        main,
        "mark_all_notifications_as_read",
        lambda: 3
    )

    response = client.post(
        "/notifications/read-all"
    )

    assert response.status_code == 200


# --------------------------------------------------
# INCIDENT LIFECYCLE TEST HELPER
# --------------------------------------------------

def mock_incident_database(monkeypatch, initial_status="Open"):

    incident = {
        "id": 1,
        "timestamp": "2026-11-20T01:00:00",
        "resource": "Memory",
        "usage_percent": 85.1,
        "severity": "Warning",
        "message": "Memory usage is high.",
        "recommendation": "Check memory-intensive processes.",
        "status": initial_status,
        "acknowledged_at": None,
        "resolved_at": None
    }

    def fake_update(incident_id, status):

        if incident_id != incident["id"]:
            return False

        incident["status"] = status

        if status == "Open":
            incident["acknowledged_at"] = None
            incident["resolved_at"] = None

        elif status == "Acknowledged":
            incident["acknowledged_at"] = "2026-11-20T01:10:00"
            incident["resolved_at"] = None

        elif status == "Resolved":
            incident["resolved_at"] = "2026-11-20T01:20:00"

        return True

    def fake_get(incident_id):

        if incident_id != incident["id"]:
            return None

        return incident.copy()

    monkeypatch.setattr(
        main,
        "update_incident_status",
        fake_update
    )

    monkeypatch.setattr(
        main,
        "get_incident_by_id",
        fake_get
    )

    return incident


# --------------------------------------------------
# INCIDENT LIFECYCLE TESTS
# --------------------------------------------------

def test_acknowledge_incident(monkeypatch):

    mock_incident_database(monkeypatch)

    response = client.patch(
        "/incidents/1/status",
        json={"status": "Acknowledged"}
    )

    assert response.status_code == 200

    data = response.json()["incident"]

    assert data["status"] == "Acknowledged"
    assert data["acknowledged_at"] is not None
    assert data["resolved_at"] is None


def test_resolve_incident(monkeypatch):

    mock_incident_database(monkeypatch)

    response = client.patch(
        "/incidents/1/status",
        json={"status": "Resolved"}
    )

    assert response.status_code == 200

    data = response.json()["incident"]

    assert data["status"] == "Resolved"
    assert data["resolved_at"] is not None


def test_reopen_resolved_incident(monkeypatch):

    mock_incident_database(
        monkeypatch,
        initial_status="Resolved"
    )

    response = client.patch(
        "/incidents/1/status",
        json={"status": "Open"}
    )

    assert response.status_code == 200

    data = response.json()["incident"]

    assert data["status"] == "Open"
    assert data["acknowledged_at"] is None
    assert data["resolved_at"] is None


def test_update_nonexistent_incident(monkeypatch):

    monkeypatch.setattr(
        main,
        "update_incident_status",
        lambda incident_id, status: False
    )

    response = client.patch(
        "/incidents/999/status",
        json={"status": "Resolved"}
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_invalid_incident_status():

    response = client.patch(
        "/incidents/1/status",
        json={"status": "Invalid"}
    )

    assert response.status_code == 422
