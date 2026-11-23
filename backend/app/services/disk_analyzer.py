
import os
from pathlib import Path


SKIP_DIRECTORIES = {
    "appdata",
    ".venv",
    "venv",
    "node_modules",
    ".git",
    "__pycache__"
}


def format_size(size_bytes):
    """Convert bytes into a readable storage size."""
    size_gb = size_bytes / (1024 ** 3)

    if size_gb >= 1:
        return f"{size_gb:.2f} GB"

    size_mb = size_bytes / (1024 ** 2)
    return f"{size_mb:.2f} MB"


def analyze_disk_space(
    root_path=None,
    top_files_limit=10,
    top_directories_limit=10
):
    """Find large files and directories without modifying anything."""

    root = Path(root_path or Path.home()).expanduser().resolve()

    if not root.exists() or not root.is_dir():
        raise ValueError("The scan location must be an existing directory.")

    largest_files = []
    directory_sizes = {}
    total_scanned_size = 0
    scanned_files = 0

    for current_root, directories, files in os.walk(
        root,
        topdown=True,
        followlinks=False
    ):
        # Skip cache and dependency folders.
        directories[:] = [
            directory for directory in directories
            if directory.lower() not in SKIP_DIRECTORIES
            and not (Path(current_root) / directory).is_symlink()
        ]

        for filename in files:
            file_path = Path(current_root) / filename

            try:
                if file_path.is_symlink():
                    continue

                file_size = file_path.stat().st_size

                relative_path = file_path.relative_to(root)
                parts = relative_path.parts

                folder_name = parts[0] if len(parts) > 1 else "Home directory"

                directory_sizes[folder_name] = (
                    directory_sizes.get(folder_name, 0) + file_size
                )

                total_scanned_size += file_size
                scanned_files += 1

                largest_files.append({
                    "file_name": filename,
                    "path": str(file_path),
                    "size_bytes": file_size,
                    "size": format_size(file_size)
                })

            except (PermissionError, OSError):
                continue

    largest_files.sort(
        key=lambda item: item["size_bytes"],
        reverse=True
    )

    largest_directories = [
        {
            "directory": name,
            "size_bytes": size,
            "size": format_size(size)
        }
        for name, size in directory_sizes.items()
    ]

    largest_directories.sort(
        key=lambda item: item["size_bytes"],
        reverse=True
    )

    recommendations = []

    for file in largest_files[:top_files_limit]:
        if file["size_bytes"] >= 500 * 1024 * 1024:
            recommendations.append(
                f"Review large file: {file['file_name']} "
                f"({file['size']})."
            )

    if not recommendations:
        recommendations.append(
            "No files larger than 500 MB were found in the scanned folders."
        )

    return {
        "scan_location": str(root),
        "total_files_scanned": scanned_files,
        "total_scanned_size": format_size(total_scanned_size),
        "largest_directories": largest_directories[:top_directories_limit],
        "largest_files": largest_files[:top_files_limit],
        "recommendations": recommendations
    }
