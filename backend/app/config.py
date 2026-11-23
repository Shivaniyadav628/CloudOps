import os

from dotenv import load_dotenv


# Load environment variables from an optional .env file.
load_dotenv()


def get_environment_integer(name, default):
    """Read an integer configuration value safely."""
    value = os.getenv(name, str(default))

    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(
            f"Environment variable {name} must be an integer."
        ) from exc


# AWS configuration.
AWS_REGION = (
    os.getenv("AWS_REGION")
    or os.getenv("AWS_DEFAULT_REGION")
    or "ap-south-1"
).strip()

# CloudWatch configuration.
CLOUDWATCH_PERIOD_SECONDS = get_environment_integer(
    "CLOUDWATCH_PERIOD_SECONDS",
    300
)

CLOUDWATCH_LOOKBACK_MINUTES = get_environment_integer(
    "CLOUDWATCH_LOOKBACK_MINUTES",
    60
)


if not AWS_REGION:
    raise ValueError("AWS_REGION cannot be empty.")

if CLOUDWATCH_PERIOD_SECONDS < 60:
    raise ValueError("CloudWatch period must be at least 60 seconds.")

if CLOUDWATCH_LOOKBACK_MINUTES < 1:
    raise ValueError("CloudWatch lookback must be at least 1 minute.")
