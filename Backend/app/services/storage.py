"""Cloudflare R2 (S3-compatible) file storage."""
import boto3
from botocore.client import Config
from app.config import get_settings

cfg = get_settings()

_s3 = None


def get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            endpoint_url=cfg.r2_endpoint,
            aws_access_key_id=cfg.r2_access_key,
            aws_secret_access_key=cfg.r2_secret_key,
            config=Config(signature_version="s3v4"),
        )
    return _s3


def upload_file(file_bytes: bytes, key: str, content_type: str = "application/pdf") -> str:
    """Upload bytes to R2 and return the public URL."""
    s3 = get_s3()
    s3.put_object(
        Bucket=cfg.r2_bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"{cfg.r2_endpoint}/{cfg.r2_bucket}/{key}"


def get_presigned_url(key: str, expires: int = 3600) -> str:
    s3 = get_s3()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": cfg.r2_bucket, "Key": key},
        ExpiresIn=expires,
    )
