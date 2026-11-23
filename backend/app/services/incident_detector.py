
def detect_incidents(metrics):
    """Detect system resource issues and generate recommendations."""

    incidents = []

    checks = [
        {
            "name": "CPU",
            "data": metrics["cpu"],
            "warning_threshold": 80,
            "critical_threshold": 90
        },
        {
            "name": "Memory",
            "data": metrics["memory"],
            "warning_threshold": 80,
            "critical_threshold": 90
        },
        {
            "name": "Disk",
            "data": metrics["disk"],
            "warning_threshold": 80,
            "critical_threshold": 90
        }
    ]

    recommendations = {
        "CPU": "Identify processes consuming high CPU resources.",
        "Memory": "Check memory-intensive applications and processes.",
        "Disk": "Inspect large files, temporary files, and disk usage."
    }

    for check in checks:
        name = check["name"]
        usage = check["data"]["usage_percent"]

        if usage >= check["critical_threshold"]:
            severity = "Critical"
        elif usage >= check["warning_threshold"]:
            severity = "Warning"
        else:
            continue

        incidents.append({
            "resource": name,
            "usage_percent": usage,
            "severity": severity,
            "message": f"{name} usage is at {usage}%.",
            "recommendation": recommendations[name]
        })

    return {
        "total_incidents": len(incidents),
        "incidents": incidents
    }
