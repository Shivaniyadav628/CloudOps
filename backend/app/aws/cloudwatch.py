from datetime import datetime, timedelta, timezone

import boto3
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    NoCredentialsError,
    PartialCredentialsError
)

from app.config import (
    AWS_REGION,
    CLOUDWATCH_PERIOD_SECONDS,
    CLOUDWATCH_LOOKBACK_MINUTES
)


def get_cloudwatch_client():
    """Create a CloudWatch client using the default AWS credential chain."""
    return boto3.client(
        "cloudwatch",
        region_name=AWS_REGION
    )


def get_ec2_cpu_metrics(instance_id: str):
    """
    Retrieve EC2 CPU utilisation metrics from CloudWatch.

    Returns average, minimum and maximum CPU utilisation.
    """
    if not instance_id or not instance_id.strip():
        raise ValueError("EC2 instance ID cannot be empty.")

    if not instance_id.startswith("i-"):
        raise ValueError("Invalid EC2 instance ID format.")

    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(
        minutes=CLOUDWATCH_LOOKBACK_MINUTES
    )

    client = get_cloudwatch_client()

    try:
        response = client.get_metric_statistics(
            Namespace="AWS/EC2",
            MetricName="CPUUtilization",
            Dimensions=[
                {
                    "Name": "InstanceId",
                    "Value": instance_id
                }
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=CLOUDWATCH_PERIOD_SECONDS,
            Statistics=[
                "Average",
                "Minimum",
                "Maximum"
            ],
            Unit="Percent"
        )

        datapoints = sorted(
            response.get("Datapoints", []),
            key=lambda item: item["Timestamp"]
        )

        if not datapoints:
            return {
                "instance_id": instance_id,
                "region": AWS_REGION,
                "metric": "CPUUtilization",
                "unit": "Percent",
                "datapoints_count": 0,
                "message": "No CloudWatch CPU metrics available for this instance and time window.",
                "datapoints": []
            }

        return {
            "instance_id": instance_id,
            "region": AWS_REGION,
            "metric": "CPUUtilization",
            "unit": "Percent",
            "datapoints_count": len(datapoints),
            "average_cpu": round(
                sum(point["Average"] for point in datapoints) / len(datapoints),
                2
            ),
            "minimum_cpu": round(
                min(point["Minimum"] for point in datapoints),
                2
            ),
            "maximum_cpu": round(
                max(point["Maximum"] for point in datapoints),
                2
            ),
            "datapoints": [
                {
                    "timestamp": point["Timestamp"].isoformat(),
                    "average": round(point["Average"], 2),
                    "minimum": round(point["Minimum"], 2),
                    "maximum": round(point["Maximum"], 2)
                }
                for point in datapoints
            ]
        }

    except (NoCredentialsError, PartialCredentialsError):
        raise RuntimeError(
            "AWS credentials are missing or incomplete. Configure AWS credentials before requesting CloudWatch metrics."
        )

    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "Unknown")
        raise RuntimeError(
            f"AWS CloudWatch request failed: {error_code}"
        ) from exc

    except BotoCoreError as exc:
        raise RuntimeError(
            "Unable to communicate with AWS CloudWatch."
        ) from exc
