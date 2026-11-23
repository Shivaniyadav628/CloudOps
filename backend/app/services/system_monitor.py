
import platform
import psutil
from datetime import datetime


def get_system_metrics():
    """Collect current system health metrics."""

    cpu_usage = psutil.cpu_percent(interval=1)

    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/" if platform.system() != "Windows" else "C:\\")

    metrics = {
        "timestamp": datetime.now().isoformat(),
        "system": platform.system(),
        "hostname": platform.node(),
        "cpu": {
            "usage_percent": cpu_usage,
            "status": "Warning" if cpu_usage >= 80 else "Healthy"
        },
        "memory": {
            "total_gb": round(memory.total / (1024 ** 3), 2),
            "used_gb": round(memory.used / (1024 ** 3), 2),
            "usage_percent": memory.percent,
            "status": "Warning" if memory.percent >= 80 else "Healthy"
        },
        "disk": {
            "total_gb": round(disk.total / (1024 ** 3), 2),
            "used_gb": round(disk.used / (1024 ** 3), 2),
            "usage_percent": disk.percent,
            "status": "Warning" if disk.percent >= 80 else "Healthy"
        }
    }

    return metrics
