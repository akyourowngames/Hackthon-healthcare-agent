from __future__ import annotations

import json
import shutil
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np

from extractor.utils import safe_stem, write_json

from .config import AgentSettings, load_agent_settings
from .embedder import embed_texts


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
) -> int:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
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
                source_path, output_path, stored_json_path, patient_name,
                report_date, lab_name, report_status, biomarker_count,
                report_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                source,
                output,
                "",
                str(payload.get("patient_name") or ""),
                str(payload.get("report_date") or ""),
                str(payload.get("lab_name") or ""),
                str(payload.get("report_status") or ""),
                len(payload.get("biomarkers") or {}),
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
        connection.commit()
    return report_id


def import_existing_output(
    json_path: str | Path,
    source_path: str | Path | None = None,
    settings: AgentSettings | None = None,
) -> int:
    resolved = Path(json_path).expanduser().resolve()
    payload = json.loads(resolved.read_text(encoding="utf-8"))
    source = source_path or resolved
    return save_report(payload, source, resolved, settings)


def save_document(
    document_path: str | Path,
    output_path: str | Path | None = None,
    settings: AgentSettings | None = None,
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
    return save_report(payload, resolved, target, settings)


def list_reports(settings: AgentSettings | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT id, patient_name, report_date, lab_name, report_status,
                   biomarker_count, source_path, stored_json_path, created_at
            FROM reports
            ORDER BY id DESC
            """
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


def source_exists(source_path: str | Path, settings: AgentSettings | None = None) -> bool:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    source = str(Path(source_path).expanduser().resolve())
    with _connect(active_settings) as connection:
        row = connection.execute(
            "SELECT id FROM reports WHERE source_path = ? LIMIT 1",
            (source,),
        ).fetchone()
    return row is not None


def search_reports(query: str, limit: int | None = None, settings: AgentSettings | None = None) -> list[SearchHit]:
    active_settings = settings or load_agent_settings()
    initialize_database(active_settings)
    safe_limit = max(1, int(limit or active_settings.search_limit))
    query_vector = np.asarray(embed_texts(query, active_settings).vectors, dtype=np.float32).reshape(-1)
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT chunks.id AS chunk_id, chunks.report_id, chunks.text,
                   chunks.vector_json, reports.patient_name, reports.report_date,
                   reports.lab_name
            FROM report_chunks AS chunks
            JOIN reports ON reports.id = chunks.report_id
            """
        ).fetchall()
    hits: list[SearchHit] = []
    for row in rows:
        vector = np.array(json.loads(row["vector_json"]), dtype=np.float32)
        aligned_query, aligned_vector = _align_vectors(query_vector, vector)
        score = float(np.dot(aligned_query, aligned_vector))
        hits.append(
            SearchHit(
                report_id=int(row["report_id"]),
                chunk_id=int(row["chunk_id"]),
                score=round(score, 4),
                text=str(row["text"]),
                patient_name=str(row["patient_name"] or ""),
                report_date=str(row["report_date"] or ""),
                lab_name=str(row["lab_name"] or ""),
            )
        )
    hits.sort(key=lambda hit: hit.score, reverse=True)
    return hits[:safe_limit]


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


def report_chunks(payload: dict[str, Any]) -> list[str]:
    chunks: list[str] = []
    patient = str(payload.get("patient_name") or "").strip()
    date = str(payload.get("report_date") or "").strip()
    lab = str(payload.get("lab_name") or "").strip()
    status = str(payload.get("report_status") or "").strip()
    header_parts = []
    if patient:
        header_parts.append(f"patient {patient}")
    if date:
        header_parts.append(f"report date {date}")
    if lab:
        header_parts.append(f"lab {lab}")
    if status:
        header_parts.append(f"report status {status}")
    if header_parts:
        chunks.append("; ".join(header_parts))

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
            source_path TEXT NOT NULL,
            output_path TEXT NOT NULL,
            stored_json_path TEXT NOT NULL,
            patient_name TEXT NOT NULL,
            report_date TEXT NOT NULL,
            lab_name TEXT NOT NULL,
            report_status TEXT NOT NULL,
            biomarker_count INTEGER NOT NULL,
            report_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS report_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            vector_json TEXT NOT NULL,
            embedding_provider TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(report_id) REFERENCES reports(id)
        )
        """
    )
    connection.commit()


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
