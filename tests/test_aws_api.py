from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


@patch("app.main.get_ec2_cpu_metrics")
def test_aws_cpu_endpoint_success(mock_metrics):
    mock_metrics.return_value = {
        "instance_id": "i-1234567890abcdef0",
        "region": "ap-south-1",
        "metric": "CPUUtilization",
        "unit": "Percent",
        "datapoints_count": 1,
        "average_cpu": 45.5,
        "minimum_cpu": 30.0,
        "maximum_cpu": 60.0,
        "datapoints": []
    }

    response = client.get(
        "/aws/ec2/cpu",
        params={"instance_id": "i-1234567890abcdef0"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["data"]["average_cpu"] == 45.5


@patch("app.main.get_ec2_cpu_metrics")
def test_aws_cpu_endpoint_no_datapoints(mock_metrics):
    mock_metrics.return_value = {
        "instance_id": "i-1234567890abcdef0",
        "region": "ap-south-1",
        "metric": "CPUUtilization",
        "unit": "Percent",
        "datapoints_count": 0,
        "message": "No CloudWatch CPU metrics available.",
        "datapoints": []
    }

    response = client.get(
        "/aws/ec2/cpu",
        params={"instance_id": "i-1234567890abcdef0"}
    )

    assert response.status_code == 200
    assert response.json()["data"]["datapoints_count"] == 0


@patch("app.main.get_ec2_cpu_metrics")
def test_aws_cpu_endpoint_aws_error(mock_metrics):
    mock_metrics.side_effect = RuntimeError(
        "AWS CloudWatch request failed: AccessDenied"
    )

    response = client.get(
        "/aws/ec2/cpu",
        params={"instance_id": "i-1234567890abcdef0"}
    )

    assert response.status_code == 503
    assert "AccessDenied" in response.json()["detail"]


def test_aws_cpu_endpoint_invalid_instance_id():
    response = client.get(
        "/aws/ec2/cpu",
        params={"instance_id": "invalid-instance"}
    )

    assert response.status_code == 422


def test_aws_cpu_endpoint_missing_instance_id():
    response = client.get("/aws/ec2/cpu")

    assert response.status_code == 422

@patch("app.main.get_ec2_instances")
def test_aws_ec2_instances_endpoint_success(mock_instances):
    mock_instances.return_value = {
        "region": "ap-south-1",
        "total_instances": 1,
        "instances": [
            {
                "instance_id": "i-1234567890abcdef0",
                "name": "CloudOps-Test",
                "instance_type": "t2.micro",
                "state": "running",
                "availability_zone": "ap-south-1a",
                "private_ip": "10.0.0.10",
                "public_ip": "13.200.100.10",
                "launch_time": "2026-11-20T10:00:00+00:00"
            }
        ]
    }

    response = client.get("/aws/ec2/instances")

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["data"]["total_instances"] == 1
    assert (
        response.json()["data"]["instances"][0]["instance_id"]
        == "i-1234567890abcdef0"
    )


@patch("app.main.get_ec2_instances")
def test_aws_ec2_instances_endpoint_aws_error(mock_instances):
    mock_instances.side_effect = RuntimeError(
        "AWS EC2 request failed: UnauthorizedOperation"
    )

    response = client.get("/aws/ec2/instances")

    assert response.status_code == 503
    assert "UnauthorizedOperation" in response.json()["detail"]


@patch("app.main.get_ec2_instances")
def test_aws_ec2_instances_endpoint_unexpected_error(mock_instances):
    mock_instances.side_effect = Exception("Unexpected failure")

    response = client.get("/aws/ec2/instances")

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Unable to retrieve AWS EC2 instances."
    )
