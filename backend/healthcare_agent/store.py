from __future__ import annotations

import json
import shutil
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np

from extractor.utils import safe_stem, write_json

from .config import AgentSettings, load_agent_settings
from .embedder import embed_texts
from .insights import (
    compact_history_context,
    compute_anomaly_findings,
    compute_health_score,
    policy_from_settings,
)
from .supabase_db import (
    cosine_similarity,
    supa_count,
    supa_delete,
    supa_insert,
    supa_select,
    supa_update,
    supa_upsert,
)


@dataclass(frozen=True)
class SearchHit:
    report_id: int
    chunk_id: int
    score: float
    text: str
    patient_name: str
    report_date: str
    lab_name: str


def initialize_database(settings: AgentSettings | None = None) -> None:
    pass


def save_report(
    payload: dict[str, Any],
    source_path: str | Path,
    output_path: str | Path,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
    source_hash: str = "",
) -> int:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    if source_hash:
        existing = supa_select(active_settings, "reports", {"source_hash": source_hash, "user_id": safe_user_id}, select="id", limit=1)
        if existing:
            return int(existing[0]["id"])
    duplicate_id = find_duplicate_report_id(payload, active_settings, safe_user_id)
    if duplicate_id is not None:
        return duplicate_id
    chunks = report_chunks(payload)
    vectors = embed_texts(chunks, active_settings)
    provider = vectors.provider
    matrix = np.asarray(vectors.vectors, dtype=np.float32)
    source = str(Path(source_path).expanduser().resolve())
    output = str(Path(output_path).expanduser().resolve())
    created_at = datetime.now().isoformat(timespec="seconds")
    rows = supa_insert(active_settings, "reports", [{
        "user_id": safe_user_id,
        "source_path": source,
        "output_path": output,
        "stored_json_path": "",
        "patient_name": str(payload.get("patient_name") or ""),
        "report_date": str(payload.get("report_date") or ""),
        "lab_name": str(payload.get("lab_name") or ""),
        "report_status": str(payload.get("report_status") or ""),
        "biomarker_count": len(payload.get("biomarkers") or {}),
        "finding_count": len(payload.get("findings") or []),
        "source_hash": source_hash,
        "report_json": json.dumps(payload, ensure_ascii=False),
        "created_at": created_at,
    }])
    report_id = int(rows[0]["id"]) if rows else 0
    if not report_id:
        return 0
    stored_path = _stored_report_path(active_settings, report_id, source_path)
    write_json(stored_path, payload)
    supa_update(active_settings, "reports", {"stored_json_path": str(stored_path)}, {"id": report_id})
    chunk_rows = [
        {
            "report_id": report_id,
            "text": text,
            "vector_json": json.dumps([float(v) for v in vec]),
            "embedding_provider": provider,
            "created_at": created_at,
        }
        for text, vec in zip(chunks, matrix)
    ]
    if chunk_rows:
        supa_insert(active_settings, "report_chunks", chunk_rows)
    _store_biomarker_history(active_settings, report_id, payload, safe_user_id, created_at)
    findings = _refresh_anomaly_findings(active_settings, safe_user_id)
    _queue_notification(active_settings, safe_user_id, report_id, findings, created_at)
    _sync_supabase_report(report_id, active_settings)
    return report_id


def find_duplicate_report_id(
    payload: dict[str, Any],
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> int | None:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    fingerprint = _report_fingerprint(payload)
    existing = supa_select(active_settings, "reports", {"user_id": safe_user_id}, select="id,report_json")
    for row in existing:
        report_json = row.get("report_json")
        if isinstance(report_json, str):
            try:
                report_json = json.loads(report_json)
            except Exception:
                continue
        if isinstance(report_json, dict) and _report_fingerprint(report_json) == fingerprint:
            return int(row["id"])
    return None


def deduplicate_reports(settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    removed: list[int] = []
    kept: list[int] = []
    all_reports = supa_select(active_settings, "reports", select="id,user_id,report_json", order="id.asc")
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in all_reports:
        report_json = row.get("report_json")
        if isinstance(report_json, str):
            try:
                report_json = json.loads(report_json)
            except Exception:
                continue
        if not isinstance(report_json, dict):
            continue
        key = str(row.get("user_id") or "") + "|" + _report_fingerprint(report_json)
        groups.setdefault(key, []).append(dict(row))
    for group in groups.values():
        if len(group) <= 1:
            continue
        keep = group[0]
        kept.append(int(keep["id"]))
        for item in group:
            rid = int(item["id"])
            if rid == int(keep["id"]):
                continue
            removed.append(rid)
            supa_delete(active_settings, "report_chunks", {"report_id": rid})
            supa_delete(active_settings, "biomarker_history", {"report_id": rid})
            supa_delete(active_settings, "reports", {"id": rid})
    if removed:
        _delete_supabase_reports(removed, active_settings)
    return {"removed": removed, "kept": kept, "removed_count": len(removed)}


def list_reports(settings: AgentSettings | None = None, user_id: str | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or "").strip()
    if not safe_user_id:
        return []
    rows = supa_select(
        active_settings, "reports",
        {"user_id": safe_user_id},
        select="id,user_id,patient_name,report_date,lab_name,report_status,biomarker_count,finding_count,source_path,stored_json_path,created_at",
        order="id.desc",
    )
    return rows


def get_report(report_id: int, settings: AgentSettings | None = None) -> dict[str, Any] | None:
    active_settings = settings or load_agent_settings()
    rows = supa_select(active_settings, "reports", {"id": report_id}, select="*", limit=1)
    if not rows:
        return None
    result = dict(rows[0])
    report_json = result.get("report_json")
    if isinstance(report_json, str):
        try:
            result["report"] = json.loads(report_json)
        except Exception:
            result["report"] = {}
    elif isinstance(report_json, dict):
        result["report"] = report_json
    else:
        result["report"] = {}
    return result


def source_exists(source_path: str | Path, settings: AgentSettings | None = None, user_id: str | None = None) -> bool:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    source = str(Path(source_path).expanduser().resolve())
    rows = supa_select(active_settings, "reports", {"source_path": source, "user_id": safe_user_id}, select="id", limit=1)
    return len(rows) > 0


def report_evidence(report_id: int, limit: int | None = None, settings: AgentSettings | None = None) -> list[SearchHit]:
    active_settings = settings or load_agent_settings()
    rows = supa_select(
        active_settings, "report_chunks",
        {"report_id": report_id},
        select="id,report_id,text",
        order="id.asc",
    )
    report_rows = supa_select(active_settings, "reports", {"id": report_id}, select="patient_name,report_date,lab_name", limit=1)
    pname = report_rows[0].get("patient_name", "") if report_rows else ""
    pdate = report_rows[0].get("report_date", "") if report_rows else ""
    lab = report_rows[0].get("lab_name", "") if report_rows else ""
    hits = [
        SearchHit(
            report_id=int(row["report_id"]),
            chunk_id=int(row["id"]),
            score=1.0,
            text=str(row["text"]),
            patient_name=str(pname or ""),
            report_date=str(pdate or ""),
            lab_name=str(lab or ""),
        )
        for row in rows
    ]
    if limit:
        return hits[:max(1, int(limit))]
    return hits


def search_reports(query: str, limit: int | None = None, settings: AgentSettings | None = None, user_id: str | None = None) -> list[SearchHit]:
    active_settings = settings or load_agent_settings()
    safe_limit = max(1, int(limit or active_settings.search_limit))
    safe_user_id = str(user_id or "").strip()
    if not safe_user_id:
        return []
    report_rows = supa_select(active_settings, "reports", {"user_id": safe_user_id}, select="id")
    report_ids = [int(r["id"]) for r in report_rows]
    if not report_ids:
        return []
    all_chunks = supa_select(
        active_settings, "report_chunks",
        {"report_id": report_ids},
        select="id,report_id,text,vector_json",
    )
    query_vector = np.asarray(embed_texts(query, active_settings).vectors, dtype=np.float32).reshape(-1)
    scored: list[tuple[float, SearchHit]] = []
    for row in all_chunks:
        try:
            vec = np.array(json.loads(row["vector_json"]), dtype=np.float32)
        except Exception:
            continue
        aligned_q, aligned_v = _align_vectors(query_vector, vec)
        score = float(np.dot(aligned_q, aligned_v))
        scored.append((score, row))
    scored.sort(key=lambda item: item[0], reverse=True)
    report_info: dict[int, dict[str, str]] = {}
    for r in report_rows:
        report_info[int(r["id"])] = {}
    report_details = supa_select(active_settings, "reports", {"id": report_ids}, select="id,patient_name,report_date,lab_name")
    for r in report_details:
        report_info[int(r["id"])] = {"patient_name": r.get("patient_name", ""), "report_date": r.get("report_date", ""), "lab_name": r.get("lab_name", "")}
    hits: list[SearchHit] = []
    used_chunks: set[int] = set()
    seen_reports: set[int] = set()
    for _, row in scored:
        if len(hits) >= safe_limit:
            break
        rid = int(row["report_id"])
        cid = int(row["id"])
        if rid in seen_reports and cid in used_chunks:
            continue
        info = report_info.get(rid, {})
        hit = SearchHit(
            report_id=rid,
            chunk_id=cid,
            score=round(score, 4),
            text=str(row["text"]),
            patient_name=str(info.get("patient_name", "")),
            report_date=str(info.get("report_date", "")),
            lab_name=str(info.get("lab_name", "")),
        )
        hits.append(hit)
        used_chunks.add(cid)
        seen_reports.add(rid)
    return hits[:safe_limit]


def list_biomarker_history(
    user_id: str | None = None,
    biomarker_name: str | None = None,
    settings: AgentSettings | None = None,
) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    filters: dict[str, Any] = {"user_id": safe_user_id}
    if biomarker_name:
        filters["biomarker_name"] = biomarker_name
    rows = supa_select(active_settings, "biomarker_history", filters, select="*", order="report_id.asc,id.asc")
    return rows


def list_anomaly_findings(user_id: str | None = None, settings: AgentSettings | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    rows = supa_select(
        active_settings, "anomaly_findings",
        {"user_id": safe_user_id},
        select="*",
        order="severity.asc,biomarker.asc",
    )
    findings = []
    for row in rows:
        item = dict(row)
        dp = item.pop("data_points", "[]")
        mj = item.pop("metrics_json", "{}")
        item["data_points"] = json.loads(dp) if isinstance(dp, str) else dp
        item["metrics"] = json.loads(mj) if isinstance(mj, str) else mj
        findings.append(item)
    return findings


def dashboard_snapshot(user_id: str | None = None, settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    history = list_biomarker_history(safe_user_id, settings=active_settings)
    findings = list_anomaly_findings(safe_user_id, active_settings)
    score = compute_health_score(history, findings, policy_from_settings(active_settings))
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in history:
        grouped.setdefault(str(row.get("biomarker_name") or ""), []).append(row)
    biomarkers = []
    for name, rows in grouped.items():
        ordered = sorted(rows, key=lambda row: (int(row.get("report_id") or 0), int(row.get("id") or 0)))
        latest = ordered[-1] if ordered else {}
        biomarkers.append({"name": name, "latest": latest, "history": ordered, "points": len(ordered)})
    biomarkers.sort(key=lambda item: str(item.get("name") or ""))
    reports = list_reports(active_settings, user_id=safe_user_id)
    return {"user_id": safe_user_id, "health_score": score, "anomalies": findings, "biomarkers": biomarkers, "history": history, "reports": reports}


def biomarker_detail(user_id: str | None, biomarker_name: str, settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    rows = list_biomarker_history(safe_user_id, biomarker_name, active_settings)
    findings = [f for f in list_anomaly_findings(safe_user_id, active_settings) if str(f.get("biomarker") or "").casefold() == str(biomarker_name or "").casefold()]
    return {"user_id": safe_user_id, "biomarker": biomarker_name, "history": rows, "anomalies": findings}


def health_context_for_query(query: str, intent: str, user_id: str | None = None, settings: AgentSettings | None = None) -> str:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    snapshot = dashboard_snapshot(safe_user_id, active_settings)
    history = snapshot.get("history") or []
    findings = snapshot.get("anomalies") or []
    score = snapshot.get("health_score") or {}
    if not isinstance(history, list):
        history = []
    if intent in {"specific_biomarker", "trend_question"}:
        selected = _semantic_biomarker_rows(query, history, active_settings)
        if selected:
            history = selected
    return compact_history_context(history, findings, score)


def create_share_link(user_id: str | None = None, report_ids: list[int] | None = None, settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    selected = [int(v) for v in report_ids or [] if int(v) > 0]
    if not selected:
        reports = list_reports(active_settings, safe_user_id)
        if reports:
            selected = [int(reports[0]["id"])]
    token = str(uuid.uuid4())
    now = datetime.now()
    expires_at = now + timedelta(days=max(1, int(active_settings.share_expiry_days)))
    supa_insert(active_settings, "share_links", [{
        "id": token, "user_id": safe_user_id, "report_ids": json.dumps(selected),
        "created_at": now.isoformat(timespec="seconds"), "expires_at": expires_at.isoformat(timespec="seconds"), "view_count": 0,
    }])
    link = {"token": token, "user_id": safe_user_id, "report_ids": selected, "expires_at": expires_at.isoformat(timespec="seconds"), "url": f"/share/{token}"}
    _sync_supabase_share(link, active_settings)
    return link


def get_share_summary(token: str, settings: AgentSettings | None = None) -> dict[str, Any] | None:
    active_settings = settings or load_agent_settings()
    rows = supa_select(active_settings, "share_links", {"id": token}, select="*", limit=1)
    if not rows:
        return None
    item = rows[0]
    if _is_expired(str(item.get("expires_at") or "")):
        return {"token": token, "expired": True, "expires_at": item.get("expires_at")}
    supa_update(active_settings, "share_links", {"view_count": int(item.get("view_count") or 0) + 1}, {"id": token})
    report_ids = json.loads(item.get("report_ids") or "[]") if isinstance(item.get("report_ids"), str) else (item.get("report_ids") or [])
    reports = [r for rid in report_ids if (r := get_report(int(rid), active_settings))]
    snapshot = dashboard_snapshot(str(item.get("user_id") or active_settings.default_user_id), active_settings)
    return {"token": token, "expired": False, "created_at": item.get("created_at"), "expires_at": item.get("expires_at"), "view_count": int(item.get("view_count") or 0) + 1, "user_id": item.get("user_id"), "reports": reports, "anomalies": snapshot.get("anomalies", []), "health_score": snapshot.get("health_score", {}), "history": snapshot.get("history", [])}


def list_notifications(user_id: str | None = None, settings: AgentSettings | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    return supa_select(active_settings, "notification_outbox", {"user_id": safe_user_id}, select="*", order="id.desc")


def report_chunks(payload: dict[str, Any]) -> list[str]:
    chunks: list[str] = []
    patient = str(payload.get("patient_name") or "").strip()
    date = str(payload.get("report_date") or "").strip()
    lab = str(payload.get("lab_name") or "").strip()
    status = str(payload.get("report_status") or "").strip()
    modality = str(payload.get("modality") or "").strip()
    body_region = str(payload.get("body_region") or "").strip()
    header_parts = []
    if patient:
        header_parts.append(f"patient {patient}")
    if date:
        header_parts.append(f"report date {date}")
    if lab:
        header_parts.append(f"lab {lab}")
    if status:
        header_parts.append(f"report status {status}")
    if modality:
        header_parts.append(f"imaging modality {modality}")
    if body_region:
        header_parts.append(f"body region {body_region}")
    if header_parts:
        chunks.append("; ".join(header_parts))
    summary = str(payload.get("summary") or "").strip()
    if summary:
        chunks.append(f"report summary; {summary}")
    biomarkers = payload.get("biomarkers") or {}
    if isinstance(biomarkers, dict):
        for name, value in biomarkers.items():
            if not isinstance(value, dict):
                continue
            parts = [f"biomarker {name}"]
            if value.get("value") is not None:
                parts.append(f"value {value.get('value')}")
            if value.get("unit"):
                parts.append(f"unit {value.get('unit')}")
            if value.get("ref_range"):
                parts.append(f"reference range {value.get('ref_range')}")
            if value.get("flag"):
                parts.append(f"flag {value.get('flag')}")
                if str(value.get("flag")).upper() not in {"NORMAL", "PENDING"}:
                    parts.append("status abnormal")
            chunks.append("; ".join(parts))
    findings = payload.get("findings") or []
    if isinstance(findings, list):
        for finding in findings:
            if not isinstance(finding, dict):
                continue
            parts = []
            title = str(finding.get("title") or "").strip()
            detail = str(finding.get("detail") or "").strip()
            severity = str(finding.get("severity") or "").strip()
            if title:
                parts.append(f"finding {title}")
            if detail:
                parts.append(f"detail {detail}")
            if severity:
                parts.append(f"severity {severity}")
            if parts:
                chunks.append("; ".join(parts))
    document_text = str(payload.get("document_text") or "").strip()
    for index, chunk in enumerate(text_chunks(document_text), start=1):
        chunks.append(f"document section {index}; {chunk}")
    return chunks or ["empty report"]


def text_chunks(text: str, max_chars: int = 900) -> list[str]:
    clean = str(text or "").strip()
    if not clean:
        return []
    chunks: list[str] = []
    current: list[str] = []
    current_size = 0
    for raw_line in clean.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if len(line) > max_chars:
            if current:
                chunks.append(" ".join(current))
                current = []
                current_size = 0
            start = 0
            while start < len(line):
                chunks.append(line[start:start + max_chars])
                start += max_chars
            continue
        projected_size = current_size + len(line) + (1 if current else 0)
        if current and projected_size > max_chars:
            chunks.append(" ".join(current))
            current = [line]
            current_size = len(line)
        else:
            current.append(line)
            current_size = projected_size
    if current:
        chunks.append(" ".join(current))
    return chunks


def copy_source_to_storage(source_path: str | Path, settings: AgentSettings | None = None) -> Path:
    active_settings = settings or load_agent_settings()
    active_settings.reports_dir.mkdir(parents=True, exist_ok=True)
    source = Path(source_path).expanduser().resolve()
    target = active_settings.reports_dir / source.name
    if source.exists() and source != target:
        shutil.copy2(source, target)
    return target


def _stored_report_path(settings: AgentSettings, report_id: int, source_path: str | Path) -> Path:
    stem = safe_stem(source_path)
    return settings.reports_dir / f"report_{report_id}_{stem}.json"


def _sync_supabase_report(report_id: int, settings: AgentSettings) -> None:
    pass


def _sync_supabase_share(link: dict[str, Any], settings: AgentSettings) -> None:
    pass


def _delete_supabase_reports(report_ids: list[int], settings: AgentSettings) -> None:
    pass


def _report_fingerprint(payload: dict[str, Any]) -> str:
    status = str(payload.get("report_status") or "").casefold().strip()
    biomarkers = payload.get("biomarkers") or {}
    is_image = status in {"image", "scan"} or (not biomarkers and payload.get("findings"))
    if is_image:
        findings = payload.get("findings") or []
        normalized_findings = []
        if isinstance(findings, list):
            for item in findings:
                if not isinstance(item, dict):
                    continue
                normalized_findings.append({
                    "title": str(item.get("title") or "").casefold().strip(),
                    "detail": str(item.get("detail") or "").casefold().strip(),
                    "severity": str(item.get("severity") or "").casefold().strip(),
                })
        normalized_findings.sort(key=lambda e: (e["title"], e["detail"]))
        normalized = {"kind": "image", "modality": str(payload.get("modality") or "").casefold().strip(), "body_region": str(payload.get("body_region") or "").casefold().strip(), "summary": str(payload.get("summary") or "").casefold().strip(), "findings": normalized_findings}
        return json.dumps(normalized, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    normalized = {"patient_name": str(payload.get("patient_name") or "").casefold().strip(), "report_date": str(payload.get("report_date") or "").casefold().strip(), "lab_name": str(payload.get("lab_name") or "").casefold().strip(), "report_status": status, "biomarkers": biomarkers}
    return json.dumps(normalized, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _store_biomarker_history(settings: AgentSettings, report_id: int, payload: dict[str, Any], user_id: str, created_at: str) -> None:
    supa_delete(settings, "biomarker_history", {"report_id": report_id})
    biomarkers = payload.get("biomarkers") or {}
    if not isinstance(biomarkers, dict):
        return
    rows = []
    for name, value in biomarkers.items():
        if not isinstance(value, dict):
            continue
        numeric_value = value.get("value")
        rows.append({
            "user_id": user_id, "report_id": int(report_id), "biomarker_name": str(name),
            "value": float(numeric_value) if numeric_value is not None else None,
            "unit": str(value.get("unit") or ""), "flag": str(value.get("flag") or ""),
            "ref_range": str(value.get("ref_range") or ""),
            "report_date": str(payload.get("report_date") or ""),
            "lab_name": str(payload.get("lab_name") or ""),
            "created_at": created_at,
        })
    if rows:
        supa_insert(settings, "biomarker_history", rows)


def _refresh_anomaly_findings(settings: AgentSettings, user_id: str) -> list[dict[str, Any]]:
    rows = supa_select(settings, "biomarker_history", {"user_id": user_id}, select="*", order="report_id.asc,id.asc")
    history = [dict(row) for row in rows]
    findings = compute_anomaly_findings(history, policy_from_settings(settings))
    supa_delete(settings, "anomaly_findings", {"user_id": user_id})
    now = datetime.now().isoformat(timespec="seconds")
    if findings:
        insert_rows = [{
            "user_id": user_id, "biomarker": str(f.get("biomarker") or ""), "finding_type": str(f.get("finding_type") or ""),
            "severity": str(f.get("severity") or "watch"), "description": str(f.get("description") or ""),
            "data_points": json.dumps(f.get("data_points") or [], ensure_ascii=False),
            "metrics_json": json.dumps(f.get("metrics") or {}, ensure_ascii=False), "detected_at": now,
        } for f in findings]
        supa_insert(settings, "anomaly_findings", insert_rows)
    return findings


def _queue_notification(settings: AgentSettings, user_id: str, report_id: int, findings: list[dict[str, Any]], created_at: str) -> None:
    if not findings:
        return
    urgent = [item for item in findings if str(item.get("severity") or "") == "urgent"]
    concern = [item for item in findings if str(item.get("severity") or "") == "concern"]
    notable = urgent or concern
    if not notable:
        return
    count = len(notable)
    subject = f"Vaidy found {count} thing{'s' if count != 1 else ''} to watch in your latest report"
    body_lines = [str(f.get("description") or "").strip() for f in notable[:5]]
    dedupe_key = f"{user_id}:{int(report_id)}:{count}"
    supa_insert(settings, "notification_outbox", [{
        "user_id": user_id, "report_id": int(report_id), "subject": subject,
        "body": "\n".join(body_lines), "status": "queued", "dedupe_key": dedupe_key, "created_at": created_at,
    }])


def _semantic_biomarker_rows(query: str, history: list[dict[str, Any]], settings: AgentSettings) -> list[dict[str, Any]]:
    names = sorted({str(row.get("biomarker_name") or "") for row in history if row.get("biomarker_name")})
    if not names:
        return []
    try:
        vectors = embed_texts([query, *names], settings).vectors
        matrix = np.asarray(vectors, dtype=np.float32)
    except Exception:
        return []
    if matrix.ndim != 2 or matrix.shape[0] < 2:
        return []
    query_vector = matrix[0]
    best_name = ""
    best_score = -1.0
    for index, name in enumerate(names, start=1):
        aligned_q, aligned_n = _align_vectors(query_vector, matrix[index])
        score = float(np.dot(aligned_q, aligned_n))
        if score > best_score:
            best_score = score
            best_name = name
    if not best_name:
        return []
    return [row for row in history if str(row.get("biomarker_name") or "") == best_name]


def _is_expired(value: str) -> bool:
    try:
        return datetime.fromisoformat(value) < datetime.now()
    except ValueError:
        return True


def _align_vectors(first: np.ndarray, second: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    a = np.asarray(first, dtype=np.float32).reshape(-1)
    b = np.asarray(second, dtype=np.float32).reshape(-1)
    if a.shape[0] == b.shape[0]:
        return a, b
    dim = max(a.shape[0], b.shape[0])
    return _pad_vector(a, dim), _pad_vector(b, dim)


def _pad_vector(vector: np.ndarray, dim: int) -> np.ndarray:
    if vector.shape[0] >= dim:
        return vector[:dim]
    return np.pad(vector, (0, dim - vector.shape[0]))
