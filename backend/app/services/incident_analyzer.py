
from app.services.process_analyzer import get_top_processes


def analyze_incident(resource, usage_percent):
    processes = get_top_processes(limit=10)

    if resource.lower() == "cpu":
        candidates = processes["top_cpu_processes"]
        candidates = [
            p for p in candidates
            if p["name"].lower() != "system idle process"
        ]
        metric = "cpu_percent"

    elif resource.lower() == "memory":
        candidates = processes["top_memory_processes"]
        metric = "memory_percent"

    else:
        return {
            "resource": resource,
            "analysis": "No process-level analysis available."
        }

    if not candidates:
        return {
            "resource": resource,
            "analysis": "No accessible processes found."
        }

    top_process = candidates[0]

    if resource.lower() == "cpu":
        recommendation = (
            f"Investigate {top_process['name']} "
            f"(PID {top_process['pid']}), which is using "
            f"{top_process[metric]}% CPU."
        )
    else:
        recommendation = (
            f"Investigate {top_process['name']} "
            f"(PID {top_process['pid']}), which is using "
            f"{top_process['memory_mb']} MB of memory."
        )

    return {
        "resource": resource,
        "system_usage_percent": usage_percent,
        "top_process": top_process,
        "recommendation": recommendation
    }
