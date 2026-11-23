
import logging
from pathlib import Path


# Store logs inside the backend folder.
LOG_DIRECTORY = Path(__file__).resolve().parents[2] / "logs"
LOG_DIRECTORY.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIRECTORY / "cloudops.log"


def get_logger(name="CloudOps"):
    """Create and return a configured application logger."""

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers during development reloads.
    if not logger.handlers:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        )

        file_handler = logging.FileHandler(
            LOG_FILE,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger


app_logger = get_logger()
