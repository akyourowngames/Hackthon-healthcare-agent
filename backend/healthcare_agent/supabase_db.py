from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import numpy as np

from .config import AgentSettings, load_agent_settings


def _headers(settings: AgentSettings) -> dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _enc(value: Any) -> str:
    return urllib.parse.quote(str(value), safe="")


def supa_select(
    settings: AgentSettings,
    table: str,
    filters: dict[str, Any] | None = None,
    select: str = "*",
    order: str | None = None,
    limit: int | None = None,
    offset: int | None = None,
) -> list[dict[str, Any]]:
    params: list[str] = [f"select={select}"]
    if filters:
        for key, value in filters.items():
            if isinstance(value, list):
                params.append(f"{key}=in.({_enc(value[0]) if len(value) == 1 else ','.join(_enc(v) for v in value)})")
            elif value is None:
                params.append(f"{key}=is.null")
            else:
                params.append(f"{key}=eq.{_enc(value)}")
    if order:
        params.append(f"order={order}")
    if limit:
        params.append(f"limit={limit}")
    if offset:
        params.append(f"offset={offset}")
    query = "&".join(params)
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?{query}"
    request = urllib.request.Request(url, headers=_headers(settings))
    try:
        with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase select {table} failed ({exc.code}): {body}") from exc


def supa_insert(
    settings: AgentSettings,
    table: str,
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not rows:
        return []
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}"
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST", headers=_headers(settings))
    try:
        with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds) as response:
            data = response.read().decode("utf-8")
            return json.loads(data) if data.strip() else []
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase insert {table} failed ({exc.code}): {body_text}") from exc


def supa_upsert(
    settings: AgentSettings,
    table: str,
    rows: list[dict[str, Any]],
    on_conflict: str = "id",
) -> list[dict[str, Any]]:
    if not rows:
        return []
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?on_conflict={on_conflict}"
    headers = _headers(settings)
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds) as response:
            data = response.read().decode("utf-8")
            return json.loads(data) if data.strip() else []
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase upsert {table} failed ({exc.code}): {body_text}") from exc


def supa_update(
    settings: AgentSettings,
    table: str,
    updates: dict[str, Any],
    filters: dict[str, Any],
) -> None:
    params: list[str] = []
    for key, value in filters.items():
        if isinstance(value, list):
            params.append(f"{key}=in.({_enc(value[0]) if len(value) == 1 else ','.join(_enc(v) for v in value)})")
        elif value is None:
            params.append(f"{key}=is.null")
        else:
            params.append(f"{key}=eq.{_enc(value)}")
    query = "&".join(params)
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?{query}"
    body = json.dumps(updates, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="PATCH", headers=_headers(settings))
    try:
        with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds):
            pass
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase update {table} failed ({exc.code}): {body_text}") from exc


def supa_delete(
    settings: AgentSettings,
    table: str,
    filters: dict[str, Any],
) -> None:
    params: list[str] = []
    for key, value in filters.items():
        if isinstance(value, list):
            params.append(f"{key}=in.({_enc(value[0]) if len(value) == 1 else ','.join(_enc(v) for v in value)})")
        else:
            params.append(f"{key}=eq.{_enc(value)}")
    query = "&".join(params)
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?{query}"
    headers = _headers(settings)
    headers["Prefer"] = "return=minimal"
    request = urllib.request.Request(url, method="DELETE", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds):
            pass
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase delete {table} failed ({exc.code}): {body_text}") from exc


def supa_rpc(
    settings: AgentSettings,
    function_name: str,
    params: dict[str, Any] | None = None,
) -> Any:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function_name}"
    body = json.dumps(params or {}, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST", headers=_headers(settings))
    try:
        with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds) as response:
            data = response.read().decode("utf-8")
            return json.loads(data) if data.strip() else None
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase rpc {function_name} failed ({exc.code}): {body_text}") from exc


def supa_count(
    settings: AgentSettings,
    table: str,
    filters: dict[str, Any] | None = None,
) -> int:
    params: list[str] = ["select=id"]
    if filters:
        for key, value in filters.items():
            if isinstance(value, list):
                params.append(f"{key}=in.({_enc(value[0]) if len(value) == 1 else ','.join(_enc(v) for v in value)})")
            elif value is None:
                params.append(f"{key}=is.null")
            else:
                params.append(f"{key}=eq.{_enc(value)}")
    params.append("limit=0")
    query = "&".join(params)
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?{query}"
    headers = _headers(settings)
    headers["Prefer"] = "count=exact"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=settings.supabase_timeout_seconds) as response:
            count_header = response.headers.get("Content-Range", "")
            if "/" in count_header:
                return int(count_header.split("/")[-1])
            return 0
    except urllib.error.HTTPError:
        return 0


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a_flat = np.asarray(a, dtype=np.float32).reshape(-1)
    b_flat = np.asarray(b, dtype=np.float32).reshape(-1)
    if a_flat.shape[0] != b_flat.shape[0]:
        dim = max(a_flat.shape[0], b_flat.shape[0])
        a_flat = np.pad(a_flat, (0, max(0, dim - a_flat.shape[0])))[:dim]
        b_flat = np.pad(b_flat, (0, max(0, dim - b_flat.shape[0])))[:dim]
    norm_a = float(np.linalg.norm(a_flat))
    norm_b = float(np.linalg.norm(b_flat))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_flat, b_flat) / (norm_a * norm_b))
