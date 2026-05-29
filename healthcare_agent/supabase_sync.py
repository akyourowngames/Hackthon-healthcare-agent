from __future__ import annotations

import json
import base64
import threading
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from extractor.utils import write_text

from .config import AgentSettings, load_agent_settings


@dataclass(frozen=True)
class SupabaseStatus:
    enabled: bool
    configured: bool
    url: str
    async_sync: bool
    storage_bucket: str


def supabase_status(settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    status = SupabaseStatus(
        enabled=active_settings.supabase_enabled,
        configured=_configured(active_settings),
        url=_public_url(active_settings.supabase_url),
        async_sync=active_settings.supabase_sync_async,
        storage_bucket=active_settings.supabase_storage_bucket,
    )
    return asdict(status)


def sync_report_async(report_id: int, settings: AgentSettings | None = None) -> None:
    active_settings = settings or load_agent_settings()
    if not active_settings.supabase_enabled or not _configured(active_settings):
        return
    if active_settings.supabase_sync_async:
        thread = threading.Thread(target=sync_report_bundle, args=(int(report_id), active_settings), daemon=True)
        thread.start()
        return
    sync_report_bundle(int(report_id), active_settings)


def sync_share_link_async(link: dict[str, Any], settings: AgentSettings | None = None) -> None:
    active_settings = settings or load_agent_settings()
    if not active_settings.supabase_enabled or not _configured(active_settings):
        return
    if active_settings.supabase_sync_async:
        thread = threading.Thread(target=sync_share_link, args=(link, active_settings), daemon=True)
        thread.start()
        return
    sync_share_link(link, active_settings)


def sync_share_link(link: dict[str, Any], settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.supabase_enabled or not _configured(active_settings):
        return {"synced": False, "reason": "disabled_or_unconfigured"}
    try:
        _upsert(
            active_settings,
            "share_links",
            [
                {
                    "id": link.get("token") or link.get("id"),
                    "user_id": link.get("user_id") or active_settings.default_user_id,
                    "report_ids": link.get("report_ids") or [],
                    "expires_at": link.get("expires_at") or datetime.now().isoformat(timespec="seconds"),
                }
            ],
            "id",
        )
    except Exception as exc:
        _write_sync_error(active_settings, 0, exc)
        return {"synced": False, "reason": str(exc)}
    return {"synced": True, "token": link.get("token") or link.get("id")}


def sync_report_bundle(
    report_id: int,
    settings: AgentSettings | None = None,
    access_token: str = "",
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.supabase_enabled or not _configured(active_settings):
        return {"synced": False, "reason": "disabled_or_unconfigured"}
    if not str(access_token or "").strip() and _jwt_role(active_settings.supabase_service_role_key) == "anon":
        return {"synced": False, "reason": "auth_token_or_service_role_required"}

    from .store import get_report, list_anomaly_findings, list_biomarker_history, list_notifications

    record = get_report(report_id, active_settings)
    if record is None:
        return {"synced": False, "reason": "report_not_found"}
    report_payload = record.get("report") or {}
    user_id = str(record.get("user_id") or active_settings.default_user_id)
    try:
        _upsert(
            active_settings,
            "reports",
            [
                {
                    "local_report_id": int(record["id"]),
                    "user_id": user_id,
                    "patient_name": record.get("patient_name") or "",
                    "report_date": record.get("report_date") or "",
                    "lab_name": record.get("lab_name") or "",
                    "report_status": record.get("report_status") or "",
                    "biomarker_count": int(record.get("biomarker_count") or 0),
                    "source_path": record.get("source_path") or "",
                    "report_json": report_payload,
                    "created_at": record.get("created_at") or datetime.now().isoformat(timespec="seconds"),
                }
            ],
            "local_report_id",
            access_token=access_token,
        )
        history_rows = [
            {
                "local_id": int(row.get("id") or 0),
                "user_id": row.get("user_id") or user_id,
                "local_report_id": int(row.get("report_id") or 0),
                "biomarker_name": row.get("biomarker_name") or "",
                "value": row.get("value"),
                "unit": row.get("unit") or "",
                "flag": row.get("flag") or "",
                "ref_range": row.get("ref_range") or "",
                "report_date": row.get("report_date") or "",
                "lab_name": row.get("lab_name") or "",
                "created_at": row.get("created_at") or datetime.now().isoformat(timespec="seconds"),
            }
            for row in list_biomarker_history(user_id, settings=active_settings)
            if int(row.get("report_id") or 0) == int(report_id)
        ]
        if history_rows:
            _upsert(active_settings, "biomarker_history", history_rows, "local_id", access_token=access_token)
        findings = [
            {
                "local_id": int(item.get("id") or 0),
                "user_id": item.get("user_id") or user_id,
                "biomarker": item.get("biomarker") or "",
                "finding_type": item.get("finding_type") or "",
                "severity": item.get("severity") or "",
                "description": item.get("description") or "",
                "data_points": item.get("data_points") or [],
                "metrics": item.get("metrics") or {},
                "detected_at": item.get("detected_at") or datetime.now().isoformat(timespec="seconds"),
            }
            for item in list_anomaly_findings(user_id, active_settings)
        ]
        if findings:
            _upsert(active_settings, "anomaly_findings", findings, "local_id", access_token=access_token)
        notifications = [
            {
                "local_id": int(item.get("id") or 0),
                "user_id": item.get("user_id") or user_id,
                "local_report_id": int(item.get("report_id") or 0),
                "subject": item.get("subject") or "",
                "body": item.get("body") or "",
                "status": item.get("status") or "queued",
                "created_at": item.get("created_at") or datetime.now().isoformat(timespec="seconds"),
            }
            for item in list_notifications(user_id, active_settings)
            if int(item.get("report_id") or 0) == int(report_id)
        ]
        if notifications:
            _upsert(active_settings, "notification_outbox", notifications, "local_id", access_token=access_token)
    except Exception as exc:
        _write_sync_error(active_settings, report_id, exc)
        return {"synced": False, "reason": str(exc)}
    return {
        "synced": True,
        "report_id": int(report_id),
        "biomarker_rows": len(history_rows),
        "anomaly_rows": len(findings),
        "notification_rows": len(notifications),
    }


def upload_source_file(
    source_path: str | Path,
    user_id: str,
    settings: AgentSettings | None = None,
    label: str = "",
    access_token: str = "",
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.supabase_enabled or not _configured(active_settings):
        return {"uploaded": False, "reason": "disabled_or_unconfigured"}
    source = Path(source_path).expanduser().resolve()
    if not source.exists() or not source.is_file():
        return {"uploaded": False, "reason": "source_file_not_found"}
    bucket = active_settings.supabase_storage_bucket.strip()
    if not bucket:
        return {"uploaded": False, "reason": "storage_bucket_not_configured"}
    safe_user = _safe_storage_segment(user_id or active_settings.default_user_id)
    safe_name = _safe_storage_segment(label or source.name)
    storage_path = f"{safe_user}/{safe_name}"
    try:
        encoded_bucket = urllib.parse.quote(bucket, safe="")
        encoded_path = "/".join(urllib.parse.quote(part, safe="") for part in storage_path.split("/"))
        url = f"{active_settings.supabase_url.rstrip('/')}/storage/v1/object/{encoded_bucket}/{encoded_path}"
        data = source.read_bytes()
        request = urllib.request.Request(url, data=data, method="POST")
        request.add_header("Content-Type", _content_type(source.suffix))
        request.add_header("apikey", active_settings.supabase_service_role_key)
        request.add_header("Authorization", f"Bearer {_auth_token(active_settings, access_token)}")
        request.add_header("x-upsert", "true")
        with urllib.request.urlopen(request, timeout=active_settings.supabase_timeout_seconds) as response:
            if response.status >= 400:
                raise RuntimeError(f"Supabase storage upload failed with {response.status}")
    except Exception as exc:
        _write_sync_error(active_settings, 0, exc)
        return {"uploaded": False, "reason": str(exc), "bucket": bucket, "path": storage_path}
    return {"uploaded": True, "bucket": bucket, "path": storage_path}


def _upsert(
    settings: AgentSettings,
    table: str,
    rows: list[dict[str, Any]],
    conflict: str,
    access_token: str = "",
) -> None:
    if not rows:
        return
    base_url = settings.supabase_url.rstrip("/")
    url = f"{base_url}/rest/v1/{table}?on_conflict={conflict}"
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Content-Type", "application/json")
    request.add_header("apikey", settings.supabase_service_role_key)
    request.add_header("Authorization", f"Bearer {_auth_token(settings, access_token)}")
    request.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
    with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds) as response:
        if response.status >= 400:
            raise RuntimeError(f"Supabase {table} sync failed with {response.status}")


def _configured(settings: AgentSettings) -> bool:
    return bool(settings.supabase_url.strip() and settings.supabase_service_role_key.strip())


def _public_url(value: str) -> str:
    return value.strip().rstrip("/")


def _auth_token(settings: AgentSettings, access_token: str = "") -> str:
    cleaned = str(access_token or "").strip()
    if cleaned:
        return cleaned
    return settings.supabase_service_role_key


def _jwt_role(token: str) -> str:
    parts = str(token or "").split(".")
    if len(parts) < 2:
        return ""
    try:
        payload = parts[1]
        padded = payload + "=" * ((4 - len(payload) % 4) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8"))
        data = json.loads(decoded.decode("utf-8"))
    except Exception:
        return ""
    return str(data.get("role") or "")


def _write_sync_error(settings: AgentSettings, report_id: int, exc: Exception) -> None:
    payload = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "report_id": int(report_id),
        "error": str(exc),
    }
    path = settings.database_path.parent / "supabase_sync_errors.jsonl"
    previous = path.read_text(encoding="utf-8") if path.exists() else ""
    write_text(path, previous + json.dumps(payload, ensure_ascii=False) + "\n")


def _safe_storage_segment(value: str) -> str:
    cleaned: list[str] = []
    for char in str(value or "").strip():
        if char in {"/", "\\", ":", "*", "?", '"', "<", ">", "|"}:
            cleaned.append("_")
        elif ord(char) < 32:
            cleaned.append("_")
        else:
            cleaned.append(char)
    segment = "".join(cleaned).strip().strip(".")
    return segment or "file"


def _content_type(suffix: str) -> str:
    normalized = str(suffix or "").lower()
    mapping = {
        ".pdf": "application/pdf",
        ".json": "application/json",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".bmp": "image/bmp",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
    }
    return mapping.get(normalized, "application/octet-stream")
