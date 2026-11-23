
from datetime import datetime, timezone
from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError, NoCredentialsError

from app.aws.ec2 import get_ec2_instances


@patch("app.aws.ec2.get_ec2_client")
def test_get_ec2_instances_success(mock_client):
    fake_ec2 = Mock()
    mock_client.return_value = fake_ec2

    fake_ec2.get_paginator.return_value.paginate.return_value = [
        {
            "Reservations": [
                {
                    "Instances": [
                        {
                            "InstanceId": "i-1234567890abcdef0",
                            "InstanceType": "t2.micro",
                            "State": {"Name": "running"},
                            "Placement": {
                                "AvailabilityZone": "ap-south-1a"
                            },
                            "PrivateIpAddress": "10.0.0.10",
                            "PublicIpAddress": "13.200.100.10",
                            "LaunchTime": datetime(
                                2026, 11, 20, 10, 0,
                                tzinfo=timezone.utc
                            ),
                            "Tags": [
                                {"Key": "Name", "Value": "CloudOps-Test"}
                            ]
                        }
                    ]
                }
            ]
        }
    ]

    result = get_ec2_instances()

    assert result["total_instances"] == 1
    assert result["region"] == "ap-south-1"
    assert result["instances"][0]["instance_id"] == "i-1234567890abcdef0"
    assert result["instances"][0]["name"] == "CloudOps-Test"
    assert result["instances"][0]["state"] == "running"
    assert result["instances"][0]["instance_type"] == "t2.micro"


@patch("app.aws.ec2.get_ec2_client")
def test_get_ec2_instances_empty_response(mock_client):
    fake_ec2 = Mock()
    mock_client.return_value = fake_ec2

    fake_ec2.get_paginator.return_value.paginate.return_value = []

    result = get_ec2_instances()

    assert result["total_instances"] == 0
    assert result["instances"] == []


@patch("app.aws.ec2.get_ec2_client")
def test_get_ec2_instances_without_name_tag(mock_client):
    fake_ec2 = Mock()
    mock_client.return_value = fake_ec2

    fake_ec2.get_paginator.return_value.paginate.return_value = [
        {
            "Reservations": [
                {
                    "Instances": [
                        {
                            "InstanceId": "i-1234567890abcdef0",
                            "InstanceType": "t2.micro",
                            "State": {"Name": "stopped"},
                            "Tags": []
                        }
                    ]
                }
            ]
        }
    ]

    result = get_ec2_instances()

    assert result["instances"][0]["name"] == "Unnamed"
    assert result["instances"][0]["state"] == "stopped"
    assert result["instances"][0]["public_ip"] is None


@patch("app.aws.ec2.get_ec2_client")
def test_get_ec2_instances_missing_credentials(mock_client):
    fake_ec2 = Mock()
    mock_client.return_value = fake_ec2

    fake_ec2.get_paginator.side_effect = NoCredentialsError()

    with pytest.raises(RuntimeError, match="credentials"):
        get_ec2_instances()


@patch("app.aws.ec2.get_ec2_client")
def test_get_ec2_instances_aws_error(mock_client):
    fake_ec2 = Mock()
    mock_client.return_value = fake_ec2

    fake_ec2.get_paginator.side_effect = ClientError(
        {
            "Error": {
                "Code": "UnauthorizedOperation",
                "Message": "Not authorized"
            }
        },
        "DescribeInstances"
    )

    with pytest.raises(RuntimeError, match="UnauthorizedOperation"):
        get_ec2_instances()
