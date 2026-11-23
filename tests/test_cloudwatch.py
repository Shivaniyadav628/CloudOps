
from datetime import datetime, timezone
from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError, NoCredentialsError

from app.aws.cloudwatch import get_ec2_cpu_metrics


@patch("app.aws.cloudwatch.get_cloudwatch_client")
def test_get_ec2_cpu_metrics_success(mock_client):
    timestamp = datetime(2026, 11, 20, 10, 0, tzinfo=timezone.utc)

    fake_cloudwatch = Mock()
    fake_cloudwatch.get_metric_statistics.return_value = {
        "Datapoints": [
            {
                "Timestamp": timestamp,
                "Average": 45.5,
                "Minimum": 30.0,
                "Maximum": 60.0
            },
            {
                "Timestamp": datetime(
                    2026, 11, 20, 10, 5, tzinfo=timezone.utc
                ),
                "Average": 55.5,
                "Minimum": 40.0,
                "Maximum": 70.0
            }
        ]
    }

    mock_client.return_value = fake_cloudwatch

    result = get_ec2_cpu_metrics("i-1234567890abcdef0")

    assert result["instance_id"] == "i-1234567890abcdef0"
    assert result["metric"] == "CPUUtilization"
    assert result["datapoints_count"] == 2
    assert result["average_cpu"] == 50.5
    assert result["minimum_cpu"] == 30.0
    assert result["maximum_cpu"] == 70.0


@patch("app.aws.cloudwatch.get_cloudwatch_client")
def test_get_ec2_cpu_metrics_no_datapoints(mock_client):
    fake_cloudwatch = Mock()
    fake_cloudwatch.get_metric_statistics.return_value = {
        "Datapoints": []
    }

    mock_client.return_value = fake_cloudwatch

    result = get_ec2_cpu_metrics("i-1234567890abcdef0")

    assert result["datapoints_count"] == 0
    assert result["datapoints"] == []
    assert "No CloudWatch CPU metrics available" in result["message"]


def test_empty_instance_id():
    with pytest.raises(ValueError, match="cannot be empty"):
        get_ec2_cpu_metrics("")


def test_invalid_instance_id():
    with pytest.raises(ValueError, match="Invalid EC2 instance ID"):
        get_ec2_cpu_metrics("invalid-instance")


@patch("app.aws.cloudwatch.get_cloudwatch_client")
def test_missing_aws_credentials(mock_client):
    fake_cloudwatch = Mock()
    fake_cloudwatch.get_metric_statistics.side_effect = NoCredentialsError()
    mock_client.return_value = fake_cloudwatch

    with pytest.raises(RuntimeError, match="credentials are missing"):
        get_ec2_cpu_metrics("i-1234567890abcdef0")


@patch("app.aws.cloudwatch.get_cloudwatch_client")
def test_cloudwatch_client_error(mock_client):
    fake_cloudwatch = Mock()

    fake_cloudwatch.get_metric_statistics.side_effect = ClientError(
        {
            "Error": {
                "Code": "AccessDenied",
                "Message": "Access denied"
            }
        },
        "GetMetricStatistics"
    )

    mock_client.return_value = fake_cloudwatch

    with pytest.raises(RuntimeError, match="AccessDenied"):
        get_ec2_cpu_metrics("i-1234567890abcdef0")
