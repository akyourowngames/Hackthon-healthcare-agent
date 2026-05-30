from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

import numpy as np

from .config import AgentSettings, load_agent_settings
from .embedder import embed_texts


@dataclass(frozen=True)
class MemoryHit:
    id: int
    text: str
    score: float
    source: str
    session_id: str
    user_id: str
    importance: float
    created_at: str
    last_seen_at: str
    access_count: int


def initialize_memory(settings: AgentSettings | None = None) -> None:
    active_settings = settings or load_agent_settings()
    active_settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    with _connect(active_settings) as connection:
        _ensure_schema(connection)


def ensure_session(
    session_id: str | None = None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> str:
    active_settings = settings or load_agent_settings()
    initialize_memory(active_settings)
    safe_session_id = str(session_id or "").strip() or str(uuid.uuid4())
    safe_user_id = _safe_user_id(user_id, active_settings)
    now = _now()
    with _connect(active_settings) as connection:
        row = connection.execute(
            "SELECT session_id FROM chat_sessions WHERE session_id = ?",
            (safe_session_id,),
        ).fetchone()
        if row is None:
            connection.execute(
                """
                INSERT INTO chat_sessions (
                    session_id, user_id, title, created_at, updated_at, message_count
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (safe_session_id, safe_user_id, "", now, now, 0),
            )
        else:
            connection.execute(
                "UPDATE chat_sessions SET user_id = ?, updated_at = ? WHERE session_id = ?",
                (safe_user_id, now, safe_session_id),
            )
        connection.commit()
    return safe_session_id


def save_chat_message(
    session_id: str,
    role: str,
    content: str,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    safe_user_id = _safe_user_id(user_id, active_settings)
    safe_session_id = ensure_session(session_id, active_settings, user_id=safe_user_id)
    safe_role = str(role or "").strip().lower()
    if safe_role not in {"user", "assistant"}:
        safe_role = "user"
    text = _compact_text(content)
    if not text:
        return {"stored": False, "session_id": safe_session_id, "reason": "empty"}
    now = _now()
    with _connect(active_settings) as connection:
        session = connection.execute(
            "SELECT title, message_count FROM chat_sessions WHERE session_id = ?",
            (safe_session_id,),
        ).fetchone()
        connection.execute(
            """
            INSERT INTO chat_messages (session_id, user_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (safe_session_id, safe_user_id, safe_role, text, now),
        )
        next_title = str(session["title"] or "") if session is not None else ""
        if not next_title and safe_role == "user":
            next_title = _title_from_text(text)
        connection.execute(
            """
            UPDATE chat_sessions
            SET title = ?, updated_at = ?, message_count = message_count + 1
            WHERE session_id = ?
            """,
            (next_title, now, safe_session_id),
        )
        connection.commit()
    return {"stored": True, "session_id": safe_session_id}


def recent_session_messages(
    session_id: str,
    limit: int | None = None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> list[dict[str, str]]:
    active_settings = settings or load_agent_settings()
    if not str(session_id or "").strip():
        return []
    initialize_memory(active_settings)
    safe_user_id = _safe_user_id(user_id, active_settings)
    safe_limit = max(1, int(limit or active_settings.memory_session_history_messages))
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT role, content
            FROM chat_messages
            WHERE session_id = ? AND user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (session_id, safe_user_id, safe_limit),
        ).fetchall()
    messages = [{"role": str(row["role"]), "content": str(row["content"])} for row in rows]
    messages.reverse()
    return messages


def remember_text(
    text: str,
    source: str = "manual",
    session_id: str | None = None,
    importance: float | None = None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"stored": False, "reason": "disabled", "session_id": str(session_id or "")}
    clean_text = _compact_text(text)
    if len(clean_text) < active_settings.memory_min_text_chars:
        return {"stored": False, "reason": "too_short", "session_id": str(session_id or "")}
    safe_user_id = _safe_user_id(user_id, active_settings)
    safe_session_id = ensure_session(session_id, active_settings, user_id=safe_user_id)
    safe_source = _compact_text(source) or "manual"
    safe_importance = float(importance if importance is not None else active_settings.memory_importance_default)
    vector, provider = _embedding_vector(clean_text, active_settings)
    vector_json = json.dumps([float(value) for value in vector], ensure_ascii=False)
    text_key = _text_key(clean_text, safe_user_id)
    now = _now()
    with _connect(active_settings) as connection:
        row = connection.execute(
            "SELECT id, importance FROM memory_entries WHERE text_key = ?",
            (text_key,),
        ).fetchone()
        if row is None:
            cursor = connection.execute(
                """
                INSERT INTO memory_entries (
                    text, text_key, source, session_id, user_id, importance, vector_json,
                    embedding_provider, created_at, updated_at, last_seen_at, access_count
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    clean_text,
                    text_key,
                    safe_source,
                    safe_session_id,
                    safe_user_id,
                    safe_importance,
                    vector_json,
                    provider,
                    now,
                    now,
                    now,
                    0,
                ),
            )
            memory_id = int(cursor.lastrowid)
            stored = True
        else:
            memory_id = int(row["id"])
            next_importance = max(float(row["importance"] or 0), safe_importance)
            connection.execute(
                """
                UPDATE memory_entries
                SET source = ?, session_id = ?, user_id = ?, importance = ?, vector_json = ?,
                    embedding_provider = ?, updated_at = ?, last_seen_at = ?
                WHERE id = ?
                """,
                (
                    safe_source,
                    safe_session_id,
                    safe_user_id,
                    next_importance,
                    vector_json,
                    provider,
                    now,
                    now,
                    memory_id,
                ),
            )
            stored = False
        connection.commit()
    return {"stored": stored, "id": memory_id, "session_id": safe_session_id, "user_id": safe_user_id}


def bind_session_to_report(
    session_id: str,
    report_id: int,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"stored": False, "reason": "disabled", "session_id": str(session_id or "")}
    safe_user_id = _safe_user_id(user_id, active_settings)
    safe_session_id = ensure_session(session_id, active_settings, user_id=safe_user_id)
    now = _now()
    with _connect(active_settings) as connection:
        connection.execute(
            """
            UPDATE chat_sessions
            SET active_report_id = ?, active_report_at = ?, updated_at = ?
            WHERE session_id = ? AND user_id = ?
            """,
            (int(report_id), now, now, safe_session_id, safe_user_id),
        )
        connection.commit()
    return {"stored": True, "session_id": safe_session_id, "user_id": safe_user_id, "report_id": int(report_id), "active_report_at": now}


def fresh_session_report(
    session_id: str | None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> dict[str, Any] | None:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return None
    safe_session_id = str(session_id or "").strip()
    if not safe_session_id:
        return None
    initialize_memory(active_settings)
    safe_user_id = _safe_user_id(user_id, active_settings)
    with _connect(active_settings) as connection:
        row = connection.execute(
            """
            SELECT active_report_id, active_report_at
            FROM chat_sessions
            WHERE session_id = ? AND user_id = ?
            """,
            (safe_session_id, safe_user_id),
        ).fetchone()
    if row is None:
        return None
    report_id = row["active_report_id"]
    timestamp = str(row["active_report_at"] or "")
    if report_id in (None, 0) or not timestamp:
        return None
    try:
        marked_at = datetime.fromisoformat(timestamp)
    except ValueError:
        return None
    window_seconds = max(1, int(active_settings.fresh_upload_window_seconds))
    age = (datetime.now() - marked_at).total_seconds()
    if age < 0 or age > window_seconds:
        return None
    return {"report_id": int(report_id), "active_report_at": timestamp, "age_seconds": age}


def clear_session_report(
    session_id: str,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> None:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return
    safe_session_id = str(session_id or "").strip()
    if not safe_session_id:
        return
    safe_user_id = _safe_user_id(user_id, active_settings)
    with _connect(active_settings) as connection:
        connection.execute(
            """
            UPDATE chat_sessions
            SET active_report_id = NULL, active_report_at = ''
            WHERE session_id = ? AND user_id = ?
            """,
            (safe_session_id, safe_user_id),
        )
        connection.commit()


def remember_turn(
    session_id: str,
    user_text: str,
    assistant_text: str,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"stored": False, "reason": "disabled", "session_id": str(session_id or "")}
    safe_user_id = _safe_user_id(user_id, active_settings)
    safe_session_id = ensure_session(session_id, active_settings, user_id=safe_user_id)
    save_chat_message(safe_session_id, "user", user_text, active_settings, user_id=safe_user_id)
    save_chat_message(safe_session_id, "assistant", assistant_text, active_settings, user_id=safe_user_id)
    _maybe_summarize_session(safe_session_id, active_settings, safe_user_id)
    if not active_settings.memory_auto_store_turns:
        return {"stored": False, "session_id": safe_session_id, "reason": "auto_store_off"}
    turn_text = "\n".join(
        [
            "User:",
            _compact_text(user_text),
            "Assistant:",
            _compact_text(assistant_text),
        ]
    )
    remembered = remember_text(
        turn_text,
        source="conversation_turn",
        session_id=safe_session_id,
        settings=active_settings,
        user_id=safe_user_id,
    )
    remembered["session_id"] = safe_session_id
    return remembered


def recall_memories(
    query: str,
    session_id: str | None = None,
    limit: int | None = None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> list[MemoryHit]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return []
    initialize_memory(active_settings)
    clean_query = _compact_text(query)
    if not clean_query:
        return []
    safe_limit = max(1, int(limit or active_settings.memory_recall_limit))
    safe_session_id = str(session_id or "").strip()
    safe_user_id = _safe_user_id(user_id, active_settings)
    query_vector, _provider = _embedding_vector(clean_query, active_settings)
    query_terms = set(_terms(clean_query))
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT id, text, source, session_id, user_id, importance, vector_json,
                   created_at, last_seen_at, access_count
            FROM memory_entries
            WHERE user_id = ?
            """,
            (safe_user_id,),
        ).fetchall()
    hits: list[MemoryHit] = []
    for row in rows:
        vector = _vector_from_json(str(row["vector_json"] or "[]"), active_settings.embedding_dim)
        aligned_query, aligned_vector = _align_vectors(query_vector, vector)
        semantic_score = float(np.dot(aligned_query, aligned_vector))
        overlap_score = _overlap_score(query_terms, set(_terms(str(row["text"] or ""))))
        session_score = 1.0 if safe_session_id and str(row["session_id"] or "") == safe_session_id else 0.0
        importance_score = _clamp(float(row["importance"] or 0.0))
        total = (
            semantic_score * active_settings.memory_rank_semantic_weight
            + importance_score * active_settings.memory_rank_importance_weight
            + overlap_score * active_settings.memory_rank_overlap_weight
            + session_score * active_settings.memory_rank_session_weight
        )
        hits.append(
            MemoryHit(
                id=int(row["id"]),
                text=str(row["text"] or ""),
                score=round(float(total), 4),
                source=str(row["source"] or ""),
                session_id=str(row["session_id"] or ""),
                user_id=str(row["user_id"] or safe_user_id),
                importance=importance_score,
                created_at=str(row["created_at"] or ""),
                last_seen_at=str(row["last_seen_at"] or ""),
                access_count=int(row["access_count"] or 0),
            )
        )
    hits.sort(key=lambda item: item.score, reverse=True)
    selected = hits[:safe_limit]
    _touch_memory_hits([hit.id for hit in selected], active_settings)
    return selected


def memory_context(
    query: str,
    session_id: str | None = None,
    settings: AgentSettings | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"context": "", "hits": [], "history_messages": []}
    safe_user_id = _safe_user_id(user_id, active_settings)
    safe_session_id = ensure_session(session_id, active_settings, user_id=safe_user_id)
    history = recent_session_messages(
        safe_session_id,
        active_settings.memory_session_history_messages,
        active_settings,
        user_id=safe_user_id,
    )
    hits = recall_memories(query, safe_session_id, active_settings.memory_recall_limit, active_settings, user_id=safe_user_id)
    lines: list[str] = []
    if hits:
        lines.append("Relevant persistent memory:")
        for hit in hits:
            lines.append(f"- {hit.text}")
    summary = _session_summary(safe_session_id, active_settings, safe_user_id)
    if summary:
        lines.append("Conversation summary:")
        lines.append(summary)
    context = _fit_text_lines(lines, active_settings.memory_context_chars)
    return {
        "context": context,
        "hits": [asdict(hit) for hit in hits],
        "history_messages": history,
        "session_id": safe_session_id,
        "user_id": safe_user_id,
    }


def list_memory_entries(limit: int = 50, settings: AgentSettings | None = None) -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    initialize_memory(active_settings)
    safe_limit = max(1, int(limit))
    with _connect(active_settings) as connection:
        rows = connection.execute(
            """
            SELECT id, text, source, session_id, user_id, importance, created_at,
                   updated_at, last_seen_at, access_count, embedding_provider
            FROM memory_entries
            ORDER BY updated_at DESC, id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def memory_assessment(settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    initialize_memory(active_settings)
    with _connect(active_settings) as connection:
        session_count = _count(connection, "chat_sessions")
        message_count = _count(connection, "chat_messages")
        entry_count = _count(connection, "memory_entries")
        vector_count = connection.execute(
            "SELECT COUNT(*) AS count FROM memory_entries WHERE vector_json != ''"
        ).fetchone()["count"]
        duplicate_count = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM (
                SELECT text_key
                FROM memory_entries
                GROUP BY text_key
                HAVING COUNT(*) > 1
            )
            """
        ).fetchone()["count"]
    return {
        "enabled": active_settings.memory_enabled,
        "ok": duplicate_count == 0,
        "sessions": int(session_count),
        "messages": int(message_count),
        "entries": int(entry_count),
        "vectors": int(vector_count),
        "duplicates": int(duplicate_count),
        "recall_limit": active_settings.memory_recall_limit,
        "context_chars": active_settings.memory_context_chars,
    }


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
        CREATE TABLE IF NOT EXISTS chat_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL,
            summary TEXT NOT NULL DEFAULT '',
            summarized_message_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            message_count INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT '',
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES chat_sessions(session_id)
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS memory_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            text_key TEXT NOT NULL UNIQUE,
            source TEXT NOT NULL,
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT '',
            importance REAL NOT NULL,
            vector_json TEXT NOT NULL,
            embedding_provider TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            access_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(session_id) REFERENCES chat_sessions(session_id)
        )
        """
    )
    _ensure_column(connection, "chat_sessions", "user_id", "TEXT NOT NULL DEFAULT ''")
    _ensure_column(connection, "chat_sessions", "summary", "TEXT NOT NULL DEFAULT ''")
    _ensure_column(connection, "chat_sessions", "summarized_message_count", "INTEGER NOT NULL DEFAULT 0")
    _ensure_column(connection, "chat_sessions", "active_report_id", "INTEGER")
    _ensure_column(connection, "chat_sessions", "active_report_at", "TEXT NOT NULL DEFAULT ''")
    _ensure_column(connection, "chat_messages", "user_id", "TEXT NOT NULL DEFAULT ''")
    _ensure_column(connection, "memory_entries", "user_id", "TEXT NOT NULL DEFAULT ''")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_memory_entries_session ON memory_entries(session_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, session_id, id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_memory_entries_user ON memory_entries(user_id, session_id)")
    connection.commit()


def _embedding_vector(text: str, settings: AgentSettings) -> tuple[np.ndarray, str]:
    try:
        result = embed_texts(text, settings)
        vector = np.asarray(result.vectors, dtype=np.float32).reshape(-1)
        return _normalize_vector(vector), result.provider
    except Exception:
        vector = np.zeros(max(8, int(settings.embedding_dim)), dtype=np.float32)
        vector[0] = 1.0
        return vector, "fallback"


def _vector_from_json(raw_value: str, dim: int) -> np.ndarray:
    try:
        values = json.loads(raw_value)
        vector = np.asarray(values, dtype=np.float32).reshape(-1)
    except Exception:
        vector = np.zeros(max(8, int(dim)), dtype=np.float32)
    if vector.size == 0:
        vector = np.zeros(max(8, int(dim)), dtype=np.float32)
    return _normalize_vector(vector)


def _normalize_vector(vector: np.ndarray) -> np.ndarray:
    array = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(array))
    if norm == 0:
        if array.size == 0:
            array = np.zeros(8, dtype=np.float32)
        array[0] = 1.0
        return array
    return array / norm


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


def _touch_memory_hits(ids: list[int], settings: AgentSettings) -> None:
    if not ids:
        return
    now = _now()
    with _connect(settings) as connection:
        for memory_id in ids:
            connection.execute(
                """
                UPDATE memory_entries
                SET access_count = access_count + 1, last_seen_at = ?
                WHERE id = ?
                """,
                (now, int(memory_id)),
            )
        connection.commit()


def _count(connection: sqlite3.Connection, table: str) -> int:
    row = connection.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()
    return int(row["count"] or 0)


def _ensure_column(connection: sqlite3.Connection, table: str, column: str, declaration: str) -> None:
    rows = connection.execute(f"PRAGMA table_info({table})").fetchall()
    existing = {str(row["name"]) for row in rows}
    if column in existing:
        return
    connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {declaration}")


def _maybe_summarize_session(session_id: str, settings: AgentSettings, user_id: str) -> None:
    interval = max(1, int(settings.memory_summary_exchange_interval)) * 2
    with _connect(settings) as connection:
        session = connection.execute(
            """
            SELECT message_count, summarized_message_count
            FROM chat_sessions
            WHERE session_id = ? AND user_id = ?
            """,
            (session_id, user_id),
        ).fetchone()
        if session is None:
            return
        message_count = int(session["message_count"] or 0)
        summarized = int(session["summarized_message_count"] or 0)
        if message_count - summarized < interval:
            return
        rows = connection.execute(
            """
            SELECT role, content
            FROM chat_messages
            WHERE session_id = ? AND user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (session_id, user_id, max(2, int(settings.memory_summary_max_messages))),
        ).fetchall()
        messages = [{"role": str(row["role"]), "content": str(row["content"])} for row in rows]
        messages.reverse()
        summary = _summarize_messages(messages, settings.memory_summary_max_chars)
        connection.execute(
            """
            UPDATE chat_sessions
            SET summary = ?, summarized_message_count = ?, updated_at = ?
            WHERE session_id = ? AND user_id = ?
            """,
            (summary, message_count, _now(), session_id, user_id),
        )
        connection.commit()


def _session_summary(session_id: str, settings: AgentSettings, user_id: str) -> str:
    with _connect(settings) as connection:
        row = connection.execute(
            "SELECT summary FROM chat_sessions WHERE session_id = ? AND user_id = ?",
            (session_id, user_id),
        ).fetchone()
    return str(row["summary"] or "").strip() if row is not None else ""


def _summarize_messages(messages: list[dict[str, str]], max_chars: int) -> str:
    lines: list[str] = []
    for item in messages:
        role = str(item.get("role") or "").strip()
        content = _compact_text(str(item.get("content") or ""))
        if not role or not content:
            continue
        lines.append(f"{role}: {content}")
    return _fit_text_lines(lines, max_chars)


def _compact_text(value: str) -> str:
    return " ".join(str(value or "").split()).strip()


def _text_key(value: str, user_id: str) -> str:
    return str(user_id or "").strip() + "|" + _compact_text(value).casefold()


def _safe_user_id(user_id: str | None, settings: AgentSettings) -> str:
    return str(user_id or settings.default_user_id).strip() or settings.default_user_id


def _terms(text: str) -> list[str]:
    terms: list[str] = []
    current: list[str] = []
    for character in str(text or "").casefold():
        if character.isalnum():
            current.append(character)
            continue
        if current:
            item = "".join(current)
            if len(item) > 1:
                terms.append(item)
            current = []
    if current:
        item = "".join(current)
        if len(item) > 1:
            terms.append(item)
    return terms


def _overlap_score(query_terms: set[str], text_terms: set[str]) -> float:
    if not query_terms or not text_terms:
        return 0.0
    shared = query_terms.intersection(text_terms)
    return _clamp(len(shared) / max(len(query_terms), 1))


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _fit_text_lines(lines: list[str], max_chars: int) -> str:
    safe_limit = max(0, int(max_chars))
    if safe_limit == 0:
        return ""
    result: list[str] = []
    used = 0
    for line in lines:
        next_line = str(line)
        projected = used + len(next_line) + (1 if result else 0)
        if projected > safe_limit:
            remaining = safe_limit - used - (1 if result else 0)
            if remaining > 20:
                result.append(next_line[:remaining].rstrip())
            break
        result.append(next_line)
        used = projected
    return "\n".join(result).strip()


def _title_from_text(text: str) -> str:
    clean = _compact_text(text)
    if len(clean) <= 80:
        return clean
    return clean[:77].rstrip() + "..."


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")
