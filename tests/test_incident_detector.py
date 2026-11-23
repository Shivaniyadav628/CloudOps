
from app.services.incident_detector import detect_incidents


def test_no_incidents_when_resources_are_healthy():
    metrics = {
        "cpu": {"usage_percent": 30},
        "memory": {"usage_percent": 45},
        "disk": {"usage_percent": 60}
    }

    result = detect_incidents(metrics)

    assert result["total_incidents"] == 0
    assert result["incidents"] == []


def test_cpu_warning_detection():
    metrics = {
        "cpu": {"usage_percent": 85},
        "memory": {"usage_percent": 40},
        "disk": {"usage_percent": 50}
    }

    result = detect_incidents(metrics)

    assert result["total_incidents"] == 1
    assert result["incidents"][0]["resource"] == "CPU"
    assert result["incidents"][0]["severity"] == "Warning"


def test_memory_critical_detection():
    metrics = {
        "cpu": {"usage_percent": 30},
        "memory": {"usage_percent": 95},
        "disk": {"usage_percent": 50}
    }

    result = detect_incidents(metrics)

    assert result["total_incidents"] == 1
    assert result["incidents"][0]["resource"] == "Memory"
    assert result["incidents"][0]["severity"] == "Critical"


def test_multiple_incidents_detection():
    metrics = {
        "cpu": {"usage_percent": 92},
        "memory": {"usage_percent": 85},
        "disk": {"usage_percent": 95}
    }

    result = detect_incidents(metrics)

    assert result["total_incidents"] == 3

    severities = [
        incident["severity"]
        for incident in result["incidents"]
    ]

    assert severities == ["Critical", "Warning", "Critical"]


def test_incident_contains_recommendation():
    metrics = {
        "cpu": {"usage_percent": 90},
        "memory": {"usage_percent": 40},
        "disk": {"usage_percent": 50}
    }

    result = detect_incidents(metrics)

    incident = result["incidents"][0]

    assert "recommendation" in incident
    assert incident["recommendation"] != ""
