from __future__ import annotations

import json
import shutil
import sqlite3
import uuid
from contextlib import contextmanager
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


@dataclass(frozen=True)
class SearchHit:
    report_id: int
    chunk_id: int
    score: float
    text: str
    patient_name: str
    report_date: str
    lab_name: str


def initialize_database(settings: AgentSettings | None = None) -> Path:
    active_settings = settings or load_agent_settings()
    active_settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    active_settings.reports_dir.mkdir(parents=True, exist_ok=True)
    with _connect(active_settings) as connection:
        _ensure_schema(connection)
    return active_settings.database_path


def save_report(
    payload: dict[str, Any],
    source_path: str | Path,
    output_path: str | Path,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
    source_hash: str = "",
) -> int:
    active_settings = settings or load_agent_settings()
    safe_user_id = _safe_user_id(user_id, active_settings)
    initialize_database(active_settings)
    if source_hash:
        hash_dup = find_duplicate_by_hash(source_hash, safe_user_id, active_settings)
        if hash_dup is not None:
            return hash_dup
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
    with _connect(active_settings) as connection:
        cursor = connection.execute(
            """
            INSERT INTO reports (
                user_id, source_path, output_path, stored_json_path, patient_name,
                report_date, lab_name, report_status, biomarker_count, finding_count,
                source_hash, report_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                safe_user_id,
                source,
                output,
                "",
                str(payload.get("patient_name") or ""),
                str(payload.get("report_date") or ""),
                str(payload.get("lab_name") or ""),
                str(payload.get("report_status") or ""),
                len(payload.get("biomarkers") or {}),
                len(payload.get("findings") or []),
                source_hash,
                json.dumps(payload, ensure_ascii=False),
                created_at,
            ),
        )
        report_id = int(cursor.lastrowid)
        stored_path = _stored_report_path(active_settings, report_id, source_path)
        write_json(stored_path, payload)
        connection.execute(
            "UPDATE reports SET stored_json_path = ? WHERE id = ?",
            (str(stored_path), report_id),
        )
        for text, vector in zip(chunks, matrix):
            connection.execute(
                """
                INSERT INTO report_chunks (
                    report_id, text, vector_json, embedding_provider, created_at
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    text,
                    json.dumps([float(value) for value in vector]),
                    provider,
                    created_at,
                ),
            )
        _store_biomarker_history(connection, report_id, payload, safe_user_id, created_at)
        findings = _refresh_anomaly_findings(connection, safe_user_id, active_settings)
        _queue_notification(connection, safe_user_id, report_id, findings, created_at)
        connection.commit()
    _sync_supabase_report(report_id, active_settings)
    return report_id


def import_existing_output(
    json_path: str | Path,
    source_path: str | Path | None = None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> int:
    resolved = Path(json_path).expanduser().resolve()
    payload = json.loads(resolved.read_text(encoding="utf-8"))
    source = source_path or resolved
    return save_report(payload, source, resolved, settings, user_id=user_id)


def find_duplicate_report_id(
    payload: dict[str, Any],
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> int | None:
    active_settings = settings or load_agent_settings()
    safe_user_id = _safe_user_id(user_id, active_settings)
    initialize_database(active_settings)
    fingerprint = _report_fingerprint(payload)
    with _connect(active_settings) as connection:
        rows = connection.execute(
            "SELECT id, report_json FROM reports WHERE user_id = ? ORDER BY id ASC",
            (safe_user_id,),
        ).fetchall()
    for row in rows:
        existing = _json_value(row["report_json"], {})
        if isinstance(existing, dict) and _report_fingerprint(existing) == fingerprint:
            return int(row["id"])
    return None


def deduplicate_reports(settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    removed: list[int] = []
    kept: list[int] = []
    affected_users: set[str] = set()
    with _connect(active_settings) as connection:
        rows = connection.execute("SELECT id, user_id, source_path, report_json FROM reports ORDER BY id ASC").fetchall()
        groups: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            payload = _json_value(row["report_json"], {})
            if not isinstance(payload, dict):
                continue
            key = str(row["user_id"] or active_settings.default_user_id) + "|" + _report_fingerprint(payload)
            groups.setdefault(key, []).append(dict(row))
        for group in groups.values():
            if len(group) <= 1:
                continue
            keep = _preferred_duplicate(group)
            kept.append(int(keep["id"]))
            for item in group:
                report_id = int(item["id"])
                if report_id == int(keep["id"]):
                    continue
                removed.append(report_id)
                affected_users.add(str(item.get("user_id") or active_settings.default_user_id))
                connection.execute("DELETE FROM report_chunks WHERE report_id = ?", (report_id,))
                connection.execute("DELETE FROM biomarker_history WHERE report_id = ?", (report_id,))
                connection.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        for user_id in affected_users:
            _refresh_anomaly_findings(connection, user_id, active_settings)
        connection.commit()
    # Mirror the removals and refreshed findings to Supabase so the cloud view
    # matches local after de-duplication.
    if removed:
        _delete_supabase_reports(removed, active_settings)
    for user_id in affected_users:
        _sync_supabase_findings(user_id, active_settings)
    return {"removed": removed, "kept": kept, "removed_count": len(removed)}


def save_document(
    document_path: str | Path,
    output_path: str | Path | None = None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
    source_hash: str = "",
) -> int:
    resolved = Path(document_path).expanduser().resolve()
    text = resolved.read_text(encoding="utf-8", errors="replace")
    payload = {
        "patient_name": resolved.stem,
        "report_date": "",
        "lab_name": "",
        "report_status": "DOCUMENT",
        "document_type": resolved.suffix.lower().lstrip(".") or "text",
        "document_text": text,
        "biomarkers": {},
    }
    target = Path(output_path).expanduser().resolve() if output_path else resolved
    if output_path:
        write_json(target, payload)
    return save_report(payload, resolved, target, settings, user_id=user_id, source_hash=source_hash)


def list_reports(settings: AgentSettings | None = None, user_id: str | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_user_id = str(user_id or "").strip()
    if not safe_user_id:
        return []
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT id, user_id, patient_name, report_date, lab_name, report_status,
                   biomarker_count, finding_count, source_path, stored_json_path, created_at
            FROM reports
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (safe_user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_report(report_id: int, settings: AgentSettings | None = None) -> dict[str, Any] | None:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    with _connect(active_settings) as connection:
        row = connection.execute(
            "SELECT * FROM reports WHERE id = ?",
            (int(report_id),),
        ).fetchone()
    if row is None:
        return None
    result = dict(row)
    result["report"] = json.loads(result.get("report_json") or "{}")
    return result


def source_exists(source_path: str | Path, settings: AgentSettings | None = None, user_id: str | None = None) -> bool:
    active_settings = settings or load_agent_settings()
    safe_user_id = _safe_user_id(user_id, active_settings)
    initialize_database(active_settings)
    source = str(Path(source_path).expanduser().resolve())
    with _connect(active_settings) as connection:
        row = connection.execute(
            "SELECT id FROM reports WHERE source_path = ? AND user_id = ? LIMIT 1",
            (source, safe_user_id),
        ).fetchone()
    return row is not None


def report_evidence(report_id: int, limit: int | None = None, settings: AgentSettings | None = None) -> list[SearchHit]:
    """Return all stored chunks for one report as evidence hits.

    Used when a user references a specific stored report so the agent answers
    from that report's own findings instead of relying only on semantic search.
    """
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT chunks.id AS chunk_id, chunks.report_id, chunks.text,
                   reports.patient_name, reports.report_date, reports.lab_name
            FROM report_chunks AS chunks
            JOIN reports ON reports.id = chunks.report_id
            WHERE chunks.report_id = ?
            ORDER BY chunks.id ASC
            """,
            (int(report_id),),
        ).fetchall()
    hits = [
        SearchHit(
            report_id=int(row["report_id"]),
            chunk_id=int(row["chunk_id"]),
            score=1.0,
            text=str(row["text"]),
            patient_name=str(row["patient_name"] or ""),
            report_date=str(row["report_date"] or ""),
            lab_name=str(row["lab_name"] or ""),
        )
        for row in rows
    ]
    if limit:
        return hits[: max(1, int(limit))]
    return hits


def existing_report_ids(settings: AgentSettings | None = None) -> set[int]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    with _connect(active_settings) as connection:
        rows = connection.execute("SELECT id FROM reports").fetchall()
    return {int(row["id"]) for row in rows}


def search_reports(query: str, limit: int | None = None, settings: AgentSettings | None = None, user_id: str | None = None) -> list[SearchHit]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_limit = max(1, int(limit or active_settings.search_limit))
    safe_user_id = str(user_id or "").strip()
    if not safe_user_id:
        return []
    query_vector = np.asarray(embed_texts(query, active_settings).vectors, dtype=np.float32).reshape(-1)
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT chunks.id AS chunk_id, chunks.report_id, chunks.text,
                   chunks.vector_json, reports.patient_name, reports.report_date,
                   reports.lab_name
            FROM report_chunks AS chunks
            JOIN reports ON reports.id = chunks.report_id
            WHERE reports.user_id = ?
            """,
            (safe_user_id,),
        ).fetchall()
    scored: list[tuple[float, SearchHit]] = []
    for row in rows:
        vector = np.array(json.loads(row["vector_json"]), dtype=np.float32)
        aligned_query, aligned_vector = _align_vectors(query_vector, vector)
        score = float(np.dot(aligned_query, aligned_vector))
        hit = SearchHit(
            report_id=int(row["report_id"]),
            chunk_id=int(row["chunk_id"]),
            score=round(score, 4),
            text=str(row["text"]),
            patient_name=str(row["patient_name"] or ""),
            report_date=str(row["report_date"] or ""),
            lab_name=str(row["lab_name"] or ""),
        )
        scored.append((score, hit))
    scored.sort(key=lambda item: item[0], reverse=True)
    return _diversify_hits(scored, safe_limit)


def _diversify_hits(scored: list[tuple[float, "SearchHit"]], limit: int) -> list["SearchHit"]:
    """Pick top hits while spreading results across reports.

    Plain top-k retrieval lets a single report's chunks crowd out evidence from
    other reports, which hurts answers that need to compare or pull the most
    relevant report. This keeps the strongest chunk from each report first, then
    backfills the remaining slots from the global ranking. No keywords or
    patterns involved, purely score and report-id structure.
    """
    if not scored:
        return []
    selected: list[SearchHit] = []
    used_chunks: set[int] = set()
    seen_reports: set[int] = set()
    # First pass: best chunk per report, in score order.
    for _, hit in scored:
        if len(selected) >= limit:
            break
        if hit.report_id in seen_reports:
            continue
        seen_reports.add(hit.report_id)
        selected.append(hit)
        used_chunks.add(hit.chunk_id)
    # Second pass: fill remaining slots with the next strongest chunks.
    if len(selected) < limit:
        for _, hit in scored:
            if len(selected) >= limit:
                break
            if hit.chunk_id in used_chunks:
                continue
            selected.append(hit)
            used_chunks.add(hit.chunk_id)
    return selected[:limit]


def answer_question(query: str, limit: int | None = None, settings: AgentSettings | None = None) -> str:
    hits = search_reports(query, limit=limit, settings=settings)
    if not hits:
        return "No local report evidence is available yet. Ingest a report first."
    lines = ["Based on local reports:"]
    for hit in hits:
        label_parts = [f"report {hit.report_id}"]
        if hit.patient_name:
            label_parts.append(hit.patient_name)
        if hit.report_date:
            label_parts.append(hit.report_date)
        if hit.lab_name:
            label_parts.append(hit.lab_name)
        label = " | ".join(label_parts)
        lines.append(f"- {label}: {hit.text}")
    lines.append("This is report evidence, not a diagnosis.")
    return "\n".join(lines)


def list_biomarker_history(
    user_id: str | None = None,
    biomarker_name: str | None = None,
    settings: AgentSettings | None = None,
) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    params: list[Any] = [safe_user_id]
    where = "WHERE user_id = ?"
    if biomarker_name:
        where += " AND biomarker_name = ?"
        params.append(str(biomarker_name))
    with _connect(active_settings) as connection:
        rows = connection.execute(
            f"""
            SELECT id, user_id, report_id, biomarker_name, value, unit, flag,
                   ref_range, report_date, lab_name, created_at
            FROM biomarker_history
            {where}
            ORDER BY report_id ASC, id ASC
            """,
            tuple(params),
        ).fetchall()
    return [dict(row) for row in rows]


def list_anomaly_findings(user_id: str | None = None, settings: AgentSettings | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT id, user_id, biomarker, finding_type, severity, description,
                   data_points, metrics_json, detected_at
            FROM anomaly_findings
            WHERE user_id = ?
            ORDER BY
              CASE severity WHEN 'urgent' THEN 0 WHEN 'concern' THEN 1 ELSE 2 END,
              biomarker ASC
            """,
            (safe_user_id,),
        ).fetchall()
    findings = []
    for row in rows:
        item = dict(row)
        item["data_points"] = _json_value(item.pop("data_points", "[]"), [])
        item["metrics"] = _json_value(item.pop("metrics_json", "{}"), {})
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
        biomarkers.append(
            {
                "name": name,
                "latest": latest,
                "history": ordered,
                "points": len(ordered),
            }
        )
    biomarkers.sort(key=lambda item: str(item.get("name") or ""))
    reports = list_reports(active_settings, user_id=safe_user_id)
    return {
        "user_id": safe_user_id,
        "health_score": score,
        "anomalies": findings,
        "biomarkers": biomarkers,
        "history": history,
        "reports": reports,
    }


def biomarker_detail(
    user_id: str | None,
    biomarker_name: str,
    settings: AgentSettings | None = None,
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    rows = list_biomarker_history(safe_user_id, biomarker_name, active_settings)
    findings = [
        finding
        for finding in list_anomaly_findings(safe_user_id, active_settings)
        if str(finding.get("biomarker") or "").casefold() == str(biomarker_name or "").casefold()
    ]
    return {
        "user_id": safe_user_id,
        "biomarker": biomarker_name,
        "history": rows,
        "anomalies": findings,
    }


def health_context_for_query(
    query: str,
    intent: str,
    user_id: str | None = None,
    settings: AgentSettings | None = None,
) -> str:
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


def create_share_link(
    user_id: str | None = None,
    report_ids: list[int] | None = None,
    settings: AgentSettings | None = None,
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    selected_report_ids = [int(value) for value in report_ids or [] if int(value) > 0]
    if not selected_report_ids:
        reports = list_reports(active_settings)
        if reports:
            selected_report_ids = [int(reports[0]["id"])]
    token = str(uuid.uuid4())
    now = datetime.now()
    expires_at = now + timedelta(days=max(1, int(active_settings.share_expiry_days)))
    with _connect(active_settings) as connection:
        connection.execute(
            """
            INSERT INTO share_links (
                id, user_id, report_ids_json, created_at, expires_at, view_count
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                token,
                safe_user_id,
                json.dumps(selected_report_ids),
                now.isoformat(timespec="seconds"),
                expires_at.isoformat(timespec="seconds"),
                0,
            ),
        )
        connection.commit()
    link = {
        "token": token,
        "user_id": safe_user_id,
        "report_ids": selected_report_ids,
        "expires_at": expires_at.isoformat(timespec="seconds"),
        "url": f"/share/{token}",
    }
    _sync_supabase_share(link, active_settings)
    return link


def get_share_summary(token: str, settings: AgentSettings | None = None) -> dict[str, Any] | None:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_token = str(token or "").strip()
    if not safe_token:
        return None
    with _connect(active_settings) as connection:
        row = connection.execute(
            """
            SELECT id, user_id, report_ids_json, created_at, expires_at, view_count
            FROM share_links
            WHERE id = ?
            """,
            (safe_token,),
        ).fetchone()
        if row is None:
            return None
        item = dict(row)
        if _is_expired(str(item.get("expires_at") or "")):
            return {
                "token": safe_token,
                "expired": True,
                "expires_at": item.get("expires_at"),
            }
        connection.execute(
            "UPDATE share_links SET view_count = view_count + 1 WHERE id = ?",
            (safe_token,),
        )
        connection.commit()
    report_ids = [int(value) for value in _json_value(item.get("report_ids_json"), [])]
    reports = []
    for report_id in report_ids:
        record = get_report(report_id, active_settings)
        if record is not None:
            reports.append(record)
    snapshot = dashboard_snapshot(str(item.get("user_id") or active_settings.default_user_id), active_settings)
    return {
        "token": safe_token,
        "expired": False,
        "created_at": item.get("created_at"),
        "expires_at": item.get("expires_at"),
        "view_count": int(item.get("view_count") or 0) + 1,
        "user_id": item.get("user_id"),
        "reports": reports,
        "anomalies": snapshot.get("anomalies", []),
        "health_score": snapshot.get("health_score", {}),
        "history": snapshot.get("history", []),
    }


def list_notifications(user_id: str | None = None, settings: AgentSettings | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_user_id = str(user_id or active_settings.default_user_id).strip() or active_settings.default_user_id
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT id, user_id, report_id, subject, body, status, dedupe_key, created_at
            FROM notification_outbox
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (safe_user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


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
                chunks.append(line[start : start + max_chars])
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
    try:
        from .supabase_sync import sync_report_async

        sync_report_async(report_id, settings)
    except Exception:
        return


def _sync_supabase_share(link: dict[str, Any], settings: AgentSettings) -> None:
    try:
        from .supabase_sync import sync_share_link_async

        sync_share_link_async(link, settings)
    except Exception:
        return


def _delete_supabase_reports(report_ids: list[int], settings: AgentSettings) -> None:
    try:
        from .supabase_sync import delete_reports

        delete_reports(report_ids, settings)
    except Exception:
        return


def _sync_supabase_findings(user_id: str, settings: AgentSettings) -> None:
    try:
        from .supabase_sync import sync_findings_for_user

        sync_findings_for_user(user_id, settings)
    except Exception:
        return


def _ensure_column(connection: sqlite3.Connection, table: str, column: str, declaration: str) -> None:
    rows = connection.execute(f"PRAGMA table_info({table})").fetchall()
    existing = {str(row["name"]) for row in rows}
    if column in existing:
        return
    connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {declaration}")


@contextmanager
def _connect(settings: AgentSettings):
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


def _ensure_schema(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT '',
            source_path TEXT NOT NULL,
            output_path TEXT NOT NULL,
            stored_json_path TEXT NOT NULL,
            patient_name TEXT NOT NULL,
            report_date TEXT NOT NULL,
            lab_name TEXT NOT NULL,
            report_status TEXT NOT NULL,
            biomarker_count INTEGER NOT NULL,
            finding_count INTEGER NOT NULL DEFAULT 0,
            report_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    _ensure_column(connection, "reports", "user_id", "TEXT NOT NULL DEFAULT ''")
    _ensure_column(connection, "reports", "finding_count", "INTEGER NOT NULL DEFAULT 0")
    _ensure_column(connection, "reports", "source_hash", "TEXT NOT NULL DEFAULT ''")
    connection.commit()


def _store_biomarker_history(
    connection: sqlite3.Connection,
    report_id: int,
    payload: dict[str, Any],
    user_id: str,
    created_at: str,
) -> None:
    connection.execute("DELETE FROM biomarker_history WHERE report_id = ?", (int(report_id),))
    biomarkers = payload.get("biomarkers") or {}
    if not isinstance(biomarkers, dict):
        return
    for name, value in biomarkers.items():
        if not isinstance(value, dict):
            continue
        numeric_value = value.get("value")
        connection.execute(
            """
            INSERT INTO biomarker_history (
                user_id, report_id, biomarker_name, value, unit, flag,
                ref_range, report_date, lab_name, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                int(report_id),
                str(name),
                float(numeric_value) if numeric_value is not None else None,
                str(value.get("unit") or ""),
                str(value.get("flag") or ""),
                str(value.get("ref_range") or ""),
                str(payload.get("report_date") or ""),
                str(payload.get("lab_name") or ""),
                created_at,
            ),
        )


def _refresh_anomaly_findings(
    connection: sqlite3.Connection,
    user_id: str,
    settings: AgentSettings,
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT id, user_id, report_id, biomarker_name, value, unit, flag,
               ref_range, report_date, lab_name, created_at
        FROM biomarker_history
        WHERE user_id = ?
        ORDER BY report_id ASC, id ASC
        """,
        (user_id,),
    ).fetchall()
    history = [dict(row) for row in rows]
    findings = compute_anomaly_findings(history, policy_from_settings(settings))
    findings.extend(_image_findings_for_user(connection, user_id))
    connection.execute("DELETE FROM anomaly_findings WHERE user_id = ?", (user_id,))
    now = datetime.now().isoformat(timespec="seconds")
    for finding in findings:
        connection.execute(
            """
            INSERT INTO anomaly_findings (
                user_id, biomarker, finding_type, severity, description,
                data_points, metrics_json, detected_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                str(finding.get("biomarker") or ""),
                str(finding.get("finding_type") or ""),
                str(finding.get("severity") or "watch"),
                str(finding.get("description") or ""),
                json.dumps(finding.get("data_points") or [], ensure_ascii=False),
                json.dumps(finding.get("metrics") or {}, ensure_ascii=False),
                now,
            ),
        )
    return findings


def _image_findings_for_user(connection: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    """Turn radiology/image-report findings into dashboard anomaly findings.

    Image reports carry qualitative findings (title, detail, severity) instead
    of numeric biomarkers. Without this they never reach the dashboard, the
    Active Findings list, or the health score. Each image finding becomes a
    finding so image reports are first-class citizens alongside lab reports.
    """
    rows = connection.execute(
        "SELECT id, report_json, report_date, report_status FROM reports WHERE user_id = ? ORDER BY id ASC",
        (user_id,),
    ).fetchall()
    findings: list[dict[str, Any]] = []
    for row in rows:
        payload = _json_value(row["report_json"], {})
        if not isinstance(payload, dict):
            continue
        image_findings = payload.get("findings")
        if not isinstance(image_findings, list) or not image_findings:
            continue
        modality = str(payload.get("modality") or "").strip()
        body_region = str(payload.get("body_region") or "").strip()
        # A successful image extraction sets at least a modality or body region.
        # When both are absent the extractor only produced a status placeholder
        # (failed/empty extraction), so its "findings" are operational notes, not
        # clinical findings. Skip the whole report in that case.
        if not modality and not body_region:
            continue
        report_date = str(row["report_date"] or payload.get("report_date") or "")
        for item in image_findings:
            if not isinstance(item, dict):
                continue
            # Skip extractor status placeholders (failed/empty extraction);
            # they are operational notes, not real clinical findings.
            if item.get("system_note"):
                continue
            title = str(item.get("title") or "").strip()
            detail = str(item.get("detail") or "").strip()
            severity = str(item.get("severity") or "watch").strip().lower()
            if severity not in {"watch", "concern", "urgent"}:
                severity = "watch"
            if not title and not detail:
                continue
            label = title or "Imaging finding"
            descriptor = detail or title
            context_bits = [bit for bit in (modality, body_region) if bit]
            context = f" ({', '.join(context_bits)})" if context_bits else ""
            findings.append(
                {
                    "biomarker": label,
                    "finding_type": "image_finding",
                    "severity": severity,
                    "description": f"{descriptor}{context}".strip(),
                    "data_points": [
                        {
                            "report_id": int(row["id"]),
                            "report_date": report_date,
                            "modality": modality,
                            "body_region": body_region,
                        }
                    ],
                    "metrics": {
                        "modality": modality,
                        "body_region": body_region,
                        "source": "image",
                    },
                }
            )
    return findings


def _queue_notification(
    connection: sqlite3.Connection,
    user_id: str,
    report_id: int,
    findings: list[dict[str, Any]],
    created_at: str,
) -> None:
    if not findings:
        return
    urgent = [item for item in findings if str(item.get("severity") or "") == "urgent"]
    concern = [item for item in findings if str(item.get("severity") or "") == "concern"]
    notable = urgent or concern
    if not notable:
        return
    count = len(notable)
    subject = f"Vaidy found {count} thing{'s' if count != 1 else ''} to watch in your latest report"
    body_lines = []
    for finding in notable[:5]:
        body_lines.append(str(finding.get("description") or "").strip())
    dedupe_key = f"{user_id}:{int(report_id)}:{count}"
    connection.execute(
        """
        INSERT OR IGNORE INTO notification_outbox (
            user_id, report_id, subject, body, status, dedupe_key, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, int(report_id), subject, "\n".join(body_lines), "queued", dedupe_key, created_at),
    )


def _semantic_biomarker_rows(
    query: str,
    history: list[dict[str, Any]],
    settings: AgentSettings,
) -> list[dict[str, Any]]:
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
        aligned_query, aligned_name = _align_vectors(query_vector, matrix[index])
        score = float(np.dot(aligned_query, aligned_name))
        if score > best_score:
            best_score = score
            best_name = name
    if not best_name:
        return []
    return [row for row in history if str(row.get("biomarker_name") or "") == best_name]


def _json_value(raw_value: Any, fallback: Any) -> Any:
    try:
        return json.loads(str(raw_value or ""))
    except Exception:
        return fallback


def _is_expired(value: str) -> bool:
    try:
        expires_at = datetime.fromisoformat(value)
    except ValueError:
        return True
    return expires_at < datetime.now()


def _report_fingerprint(payload: dict[str, Any]) -> str:
    status = str(payload.get("report_status") or "").casefold().strip()
    biomarkers = payload.get("biomarkers") or {}
    is_image = status in {"image", "scan"} or (not biomarkers and payload.get("findings"))
    if is_image:
        # Image reports carry qualitative findings instead of biomarkers, and
        # their patient_name is often just the uploaded file name. Fingerprint
        # on the actual clinical content (modality, region, findings) so the
        # same scan re-uploaded under a different file name is still caught as a
        # duplicate.
        findings = payload.get("findings") or []
        normalized_findings = []
        if isinstance(findings, list):
            for item in findings:
                if not isinstance(item, dict):
                    continue
                normalized_findings.append(
                    {
                        "title": str(item.get("title") or "").casefold().strip(),
                        "detail": str(item.get("detail") or "").casefold().strip(),
                        "severity": str(item.get("severity") or "").casefold().strip(),
                    }
                )
        normalized_findings.sort(key=lambda entry: (entry["title"], entry["detail"]))
        normalized = {
            "kind": "image",
            "modality": str(payload.get("modality") or "").casefold().strip(),
            "body_region": str(payload.get("body_region") or "").casefold().strip(),
            "summary": str(payload.get("summary") or "").casefold().strip(),
            "findings": normalized_findings,
        }
        return json.dumps(normalized, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    normalized = {
        "patient_name": str(payload.get("patient_name") or "").casefold().strip(),
        "report_date": str(payload.get("report_date") or "").casefold().strip(),
        "lab_name": str(payload.get("lab_name") or "").casefold().strip(),
        "report_status": status,
        "biomarkers": biomarkers,
    }
    return json.dumps(normalized, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _safe_user_id(user_id: str | None, settings: AgentSettings) -> str:
    return str(user_id or settings.default_user_id).strip() or settings.default_user_id


def compute_file_hash(file_path: str | Path) -> str:
    import hashlib
    path = Path(file_path).expanduser().resolve()
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def find_duplicate_by_hash(source_hash: str, user_id: str, settings: AgentSettings | None = None) -> int | None:
    if not source_hash:
        return None
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    with _connect(active_settings) as connection:
        row = connection.execute(
            "SELECT id FROM reports WHERE source_hash = ? AND user_id = ? LIMIT 1",
            (source_hash, user_id),
        ).fetchone()
    return int(row["id"]) if row else None


def _preferred_duplicate(group: list[dict[str, Any]]) -> dict[str, Any]:
    def score(item: dict[str, Any]) -> tuple[int, int]:
        source = Path(str(item.get("source_path") or ""))
        return (1 if source.suffix.lower() == ".pdf" else 0, int(item.get("id") or 0))

    return max(group, key=score)


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
