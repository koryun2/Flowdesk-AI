from pathlib import Path

from django.core.files.base import ContentFile
from django.http import FileResponse
from rest_framework import serializers
from rest_framework.exceptions import NotFound


MAX_UPLOAD_BYTES = 8 * 1024 * 1024
IMAGE_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def safe_name(name: str) -> str:
    cleaned = Path(name or "file").name.replace('"', "").replace("\n", "").replace("\r", "")
    cleaned = cleaned or "file"
    if len(cleaned) <= 80:
        return cleaned
    suffix = Path(cleaned).suffix[:10]
    return f"{cleaned[: 80 - len(suffix)]}{suffix}"


def image_mime(name: str) -> str:
    return IMAGE_TYPES.get(Path(safe_name(name)).suffix.lower(), "")


def read_limited(upload) -> bytes:
    size = getattr(upload, "size", None)
    if size is not None and size > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError({"file": "Files must be 8 MB or smaller."})
    data = upload.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError({"file": "Files must be 8 MB or smaller."})
    return data


def store_bytes(instance, field_name: str, data: bytes, file_name: str) -> None:
    field = getattr(instance, field_name)
    if field:
        field.delete(save=False)
    field.save(safe_name(file_name), ContentFile(data), save=True)


def open_stored(field, file_name: str, mime_type: str):
    if not field:
        raise NotFound()
    try:
        handle = field.open("rb")
    except (FileNotFoundError, OSError, ValueError) as exc:
        raise NotFound() from exc
    response = FileResponse(handle, content_type=mime_type or "application/octet-stream")
    response["Content-Disposition"] = f'inline; filename="{safe_name(file_name)}"'
    return response
