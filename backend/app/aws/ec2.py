
import boto3

from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    NoCredentialsError,
    PartialCredentialsError
)

from app.config import AWS_REGION


def get_ec2_client():
    """Create an EC2 client using the default AWS credential chain."""
    return boto3.client(
        "ec2",
        region_name=AWS_REGION
    )


def get_ec2_instances():
    """
    Retrieve EC2 instances from the configured AWS region.

    Returns basic information about each instance.
    """
    try:
        client = get_ec2_client()
        paginator = client.get_paginator("describe_instances")

        instances = []

        for page in paginator.paginate():
            for reservation in page.get("Reservations", []):
                for instance in reservation.get("Instances", []):

                    name = next(
                        (
                            tag["Value"]
                            for tag in instance.get("Tags", [])
                            if tag["Key"] == "Name"
                        ),
                        "Unnamed"
                    )

                    instances.append({
                        "instance_id": instance.get("InstanceId"),
                        "name": name,
                        "instance_type": instance.get("InstanceType"),
                        "state": instance.get("State", {}).get("Name"),
                        "availability_zone": (
                            instance.get("Placement", {}).get(
                                "AvailabilityZone"
                            )
                        ),
                        "private_ip": instance.get("PrivateIpAddress"),
                        "public_ip": instance.get("PublicIpAddress"),
                        "launch_time": (
                            instance["LaunchTime"].isoformat()
                            if instance.get("LaunchTime")
                            else None
                        )
                    })

        return {
            "region": AWS_REGION,
            "total_instances": len(instances),
            "instances": instances
        }

    except (NoCredentialsError, PartialCredentialsError) as exc:
        raise RuntimeError(
            "AWS credentials are missing or incomplete."
        ) from exc

    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get(
            "Code", "Unknown"
        )
        raise RuntimeError(
            f"AWS EC2 request failed: {error_code}"
        ) from exc

    except BotoCoreError as exc:
        raise RuntimeError(
            "Unable to communicate with AWS EC2."
        ) from exc
