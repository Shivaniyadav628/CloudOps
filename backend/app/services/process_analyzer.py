
import time
import psutil


def get_top_processes(limit=10):
    """Identify processes consuming the most CPU and memory."""

    processes = []

    for process in psutil.process_iter(
        ["pid", "name", "username", "memory_info"]
    ):
        try:
            process.cpu_percent(interval=None)

            processes.append(process)

        except (psutil.NoSuchProcess, psutil.AccessDenied,
                psutil.ZombieProcess):
            continue

    # Sample CPU usage over a short interval
    time.sleep(0.5)

    results = []

    for process in processes:
        try:
            info = process.info
            memory_info = info.get("memory_info")

            results.append({
                "pid": info["pid"],
                "name": info["name"] or "Unknown",
                "username": info["username"],
                "cpu_percent": round(process.cpu_percent(interval=None), 2),
                "memory_percent": round(process.memory_percent(), 2),
                "memory_mb": round(
                    memory_info.rss / (1024 ** 2), 2
                ) if memory_info else 0
            })

        except (psutil.NoSuchProcess, psutil.AccessDenied,
                psutil.ZombieProcess):
            continue

    top_cpu = sorted(
        results,
        key=lambda item: item["cpu_percent"],
        reverse=True
    )[:limit]

    top_memory = sorted(
        results,
        key=lambda item: item["memory_percent"],
        reverse=True
    )[:limit]

    return {
        "total_processes": len(results),
        "top_cpu_processes": top_cpu,
        "top_memory_processes": top_memory
    }
