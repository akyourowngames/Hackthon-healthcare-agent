from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

import numpy as np

from .config import AgentSettings, load_agent_settings
from .embedder import embed_texts
from .supabase_db import supa_count, supa_delete, supa_insert, supa_select, supa_update


@dataclass(frozen=True)
class MemoryHit:
    id: int
    text: str
    score: float
    source: str
    session_id: str
    importance: float
    created_at: str
    last_seen_at: str
    access_count: int


def initialize_memory(settings: AgentSettings | None = None) -> None:
    pass


def ensure_session(session_id: str | None = None, settings: AgentSettings | None = None, user_id: str = "") -> str:
    active_settings = settings or load_agent_settings()
    safe_session_id = str(session_id or "").strip() or str(uuid.uuid4())
    safe_user_id = str(user_id or "").strip()
    now = _now()
    existing = supa_select(active_settings, "chat_sessions", {"session_id": safe_session_id}, select="session_id", limit=1)
    if not existing:
        supa_insert(active_settings, "chat_sessions", [{
            "session_id": safe_session_id, "user_id": safe_user_id, "title": "",
            "created_at": now, "updated_at": now, "message_count": 0,
        }])
    else:
        supa_update(active_settings, "chat_sessions", {"updated_at": now, "user_id": safe_user_id}, {"session_id": safe_session_id})
    return safe_session_id


def save_chat_message(
    session_id: str, role: str, content: str,
    settings: AgentSettings | None = None, user_id: str = "",
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    safe_session_id = ensure_session(session_id, active_settings, user_id=user_id)
    safe_role = str(role or "").strip().lower()
    if safe_role not in {"user", "assistant"}:
        safe_role = "user"
    text = _compact_text(content)
    if not text:
        return {"stored": False, "session_id": safe_session_id, "reason": "empty"}
    now = _now()
    supa_insert(active_settings, "chat_messages", [{
        "session_id": safe_session_id, "user_id": user_id, "role": safe_role, "content": text, "created_at": now,
    }])
    sessions = supa_select(active_settings, "chat_sessions", {"session_id": safe_session_id}, select="title,message_count", limit=1)
    session = sessions[0] if sessions else None
    next_title = str(session["title"] or "") if session else ""
    if not next_title and safe_role == "user":
        next_title = _title_from_text(text)
    msg_count = int(session["message_count"] or 0) + 1 if session else 1
    supa_update(active_settings, "chat_sessions", {"title": next_title, "updated_at": now, "message_count": msg_count}, {"session_id": safe_session_id})
    return {"stored": True, "session_id": safe_session_id}


def recent_session_messages(
    session_id: str, limit: int | None = None, settings: AgentSettings | None = None,
) -> list[dict[str, str]]:
    active_settings = settings or load_agent_settings()
    if not str(session_id or "").strip():
        return []
    safe_limit = max(1, int(limit or active_settings.memory_session_history_messages))
    rows = supa_select(
        active_settings, "chat_messages", {"session_id": session_id},
        select="role,content", order="id.desc", limit=safe_limit,
    )
    messages = [{"role": str(row["role"]), "content": str(row["content"])} for row in rows]
    messages.reverse()
    return messages


def remember_text(
    text: str, source: str = "manual", session_id: str | None = None,
    importance: float | None = None, settings: AgentSettings | None = None, user_id: str = "",
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"stored": False, "reason": "disabled", "session_id": str(session_id or "")}
    clean_text = _compact_text(text)
    if len(clean_text) < active_settings.memory_min_text_chars:
        return {"stored": False, "reason": "too_short", "session_id": str(session_id or "")}
    safe_session_id = ensure_session(session_id, active_settings, user_id=user_id)
    safe_user_id = str(user_id or "").strip()
    safe_source = _compact_text(source) or "manual"
    safe_importance = float(importance if importance is not None else active_settings.memory_importance_default)
    vector, provider = _embedding_vector(clean_text, active_settings)
    vector_json = json.dumps([float(value) for value in vector], ensure_ascii=False)
    text_key = _text_key(clean_text)
    now = _now()
    existing = supa_select(active_settings, "memory_entries", {"text_key": text_key, "user_id": safe_user_id}, select="id,importance", limit=1)
    if not existing:
        rows = supa_insert(active_settings, "memory_entries", [{
            "text": clean_text, "text_key": text_key, "source": safe_source, "user_id": safe_user_id,
            "session_id": safe_session_id, "importance": safe_importance, "vector_json": vector_json,
            "embedding_provider": provider, "created_at": now, "updated_at": now, "last_seen_at": now, "access_count": 0,
        }])
        memory_id = int(rows[0]["id"]) if rows else 0
        stored = True
    else:
        memory_id = int(existing[0]["id"])
        next_importance = max(float(existing[0]["importance"] or 0), safe_importance)
        supa_update(active_settings, "memory_entries", {
            "source": safe_source, "session_id": safe_session_id, "importance": next_importance,
            "vector_json": vector_json, "embedding_provider": provider, "updated_at": now, "last_seen_at": now,
        }, {"id": memory_id})
        stored = False
    return {"stored": stored, "id": memory_id, "session_id": safe_session_id}


def bind_session_to_report(session_id: str, report_id: int, settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"stored": False, "reason": "disabled", "session_id": str(session_id or "")}
    safe_session_id = ensure_session(session_id, active_settings)
    now = _now()
    supa_update(active_settings, "chat_sessions", {
        "active_report_id": int(report_id), "active_report_at": now, "updated_at": now,
    }, {"session_id": safe_session_id})
    return {"stored": True, "session_id": safe_session_id, "report_id": int(report_id), "active_report_at": now}


def fresh_session_report(session_id: str | None, settings: AgentSettings | None = None) -> dict[str, Any] | None:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return None
    safe_session_id = str(session_id or "").strip()
    if not safe_session_id:
        return None
    rows = supa_select(active_settings, "chat_sessions", {"session_id": safe_session_id}, select="active_report_id,active_report_at", limit=1)
    if not rows:
        return None
    row = rows[0]
    report_id = row.get("active_report_id")
    timestamp = str(row.get("active_report_at") or "")
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


def clear_session_report(session_id: str, settings: AgentSettings | None = None) -> None:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return
    safe_session_id = str(session_id or "").strip()
    if not safe_session_id:
        return
    supa_update(active_settings, "chat_sessions", {
        "active_report_id": None, "active_report_at": "",
    }, {"session_id": safe_session_id})


def remember_turn(
    session_id: str, user_text: str, assistant_text: str,
    settings: AgentSettings | None = None, user_id: str = "",
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"stored": False, "reason": "disabled", "session_id": str(session_id or "")}
    safe_session_id = ensure_session(session_id, active_settings, user_id=user_id)
    save_chat_message(safe_session_id, "user", user_text, active_settings, user_id=user_id)
    save_chat_message(safe_session_id, "assistant", assistant_text, active_settings, user_id=user_id)
    _maybe_summarize_session(safe_session_id, active_settings)
    if not active_settings.memory_auto_store_turns:
        return {"stored": False, "session_id": safe_session_id, "reason": "auto_store_off"}
    turn_text = "\n".join(["User:", _compact_text(user_text), "Assistant:", _compact_text(assistant_text)])
    remembered = remember_text(turn_text, source="conversation_turn", session_id=safe_session_id, settings=active_settings, user_id=user_id)
    remembered["session_id"] = safe_session_id
    return remembered


def recall_memories(
    query: str, session_id: str | None = None, limit: int | None = None,
    settings: AgentSettings | None = None, user_id: str = "",
) -> list[MemoryHit]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return []
    clean_query = _compact_text(query)
    if not clean_query:
        return []
    safe_limit = max(1, int(limit or active_settings.memory_recall_limit))
    safe_session_id = str(session_id or "").strip()
    safe_user_id = str(user_id or "").strip()
    query_vector, _provider = _embedding_vector(clean_query, active_settings)
    query_terms = set(_terms(clean_query))
    filters: dict[str, Any] = {}
    if safe_user_id:
        filters["user_id"] = safe_user_id
    rows = supa_select(
        active_settings, "memory_entries", filters,
        select="id,text,source,session_id,importance,vector_json,created_at,last_seen_at,access_count",
    )
    hits: list[MemoryHit] = []
    for row in rows:
        vector = _vector_from_json(str(row.get("vector_json") or "[]"), active_settings.embedding_dim)
        aligned_query, aligned_vector = _align_vectors(query_vector, vector)
        semantic_score = float(np.dot(aligned_query, aligned_vector))
        overlap_score = _overlap_score(query_terms, set(_terms(str(row.get("text") or ""))))
        session_score = 1.0 if safe_session_id and str(row.get("session_id") or "") == safe_session_id else 0.0
        importance_score = _clamp(float(row.get("importance") or 0.0))
        total = (
            semantic_score * active_settings.memory_rank_semantic_weight
            + importance_score * active_settings.memory_rank_importance_weight
            + overlap_score * active_settings.memory_rank_overlap_weight
            + session_score * active_settings.memory_rank_session_weight
        )
        hits.append(MemoryHit(
            id=int(row["id"]), text=str(row.get("text") or ""), score=round(float(total), 4),
            source=str(row.get("source") or ""), session_id=str(row.get("session_id") or ""),
            importance=importance_score, created_at=str(row.get("created_at") or ""),
            last_seen_at=str(row.get("last_seen_at") or ""), access_count=int(row.get("access_count") or 0),
        ))
    hits.sort(key=lambda item: item.score, reverse=True)
    selected = hits[:safe_limit]
    _touch_memory_hits([hit.id for hit in selected], active_settings)
    return selected


def memory_context(
    query: str, session_id: str | None = None,
    settings: AgentSettings | None = None, user_id: str = "",
) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    if not active_settings.memory_enabled:
        return {"context": "", "hits": [], "history_messages": []}
    safe_session_id = ensure_session(session_id, active_settings, user_id=user_id)
    history = recent_session_messages(safe_session_id, active_settings.memory_session_history_messages, active_settings)
    hits = recall_memories(query, safe_session_id, active_settings.memory_recall_limit, active_settings, user_id=user_id)
    lines: list[str] = []
    if hits:
        lines.append("Relevant persistent memory:")
        for hit in hits:
            lines.append(f"- {hit.text}")
    summary = _session_summary(safe_session_id, active_settings)
    if summary:
        lines.append("Conversation summary:")
        lines.append(summary)
    context = _fit_text_lines(lines, active_settings.memory_context_chars)
    return {"context": context, "hits": [asdict(hit) for hit in hits], "history_messages": history, "session_id": safe_session_id}


def list_memory_entries(limit: int = 50, settings: AgentSettings | None = None, user_id: str = "") -> list[dict[str, Any]]:
    active_settings = settings or load_agent_settings()
    safe_limit = max(1, int(limit))
    safe_user_id = str(user_id or "").strip()
    filters: dict[str, Any] = {}
    if safe_user_id:
        filters["user_id"] = safe_user_id
    return supa_select(active_settings, "memory_entries", filters, select="id,text,source,user_id,session_id,importance,created_at,updated_at,last_seen_at,access_count,embedding_provider", order="updated_at.desc,id.desc", limit=safe_limit)


def memory_assessment(settings: AgentSettings | None = None) -> dict[str, Any]:
    active_settings = settings or load_agent_settings()
    session_count = supa_count(active_settings, "chat_sessions")
    message_count = supa_count(active_settings, "chat_messages")
    entry_count = supa_count(active_settings, "memory_entries")
    return {
        "enabled": active_settings.memory_enabled,
        "ok": True,
        "sessions": session_count,
        "messages": message_count,
        "entries": entry_count,
        "vectors": entry_count,
        "duplicates": 0,
        "recall_limit": active_settings.memory_recall_limit,
        "context_chars": active_settings.memory_context_chars,
    }


def _embedding_vector(text: str, settings: AgentSettings) -> tuple[np.ndarray, str]:
    try:
        result = embed_texts(text, settings)
        vector = np.asarray(result.vectors, dtype=np.float32).reshape(-1)
        return _normalize_vector(vector), result.provider
    except Exception:
        vector = np.zeros(max(8, int(settings.embedding_dim)), dtype=np.float32)
        vector[0] = 1.0
        return vector, "fallback"


def _summarize_messages(messages: list[dict[str, str]], max_chars: int) -> str:
    lines: list[str] = []
    for item in messages:
        role = str(item.get("role") or "").strip()
        content = _compact_text(str(item.get("content") or ""))
        if not role or not content:
            continue
        lines.append(f"{role}: {content}")
    return _fit_text_lines(lines, max_chars)


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
    for memory_id in ids:
        supa_update(settings, "memory_entries", {"access_count": supa_count(settings, "memory_entries", {"id": memory_id}) + 1, "last_seen_at": now}, {"id": memory_id})


def _maybe_summarize_session(session_id: str, settings: AgentSettings) -> None:
    interval = max(1, int(settings.memory_summary_exchange_interval)) * 2
    sessions = supa_select(settings, "chat_sessions", {"session_id": session_id}, select="message_count,summarized_message_count", limit=1)
    if not sessions:
        return
    session = sessions[0]
    message_count = int(session.get("message_count") or 0)
    summarized = int(session.get("summarized_message_count") or 0)
    if message_count - summarized < interval:
        return
    rows = supa_select(settings, "chat_messages", {"session_id": session_id}, select="role,content", order="id.desc", limit=max(2, int(settings.memory_summary_max_messages)))
    messages = [{"role": str(row["role"]), "content": str(row["content"])} for row in rows]
    messages.reverse()
    summary = _summarize_messages(messages, settings.memory_summary_max_chars)
    supa_update(settings, "chat_sessions", {"summary": summary, "summarized_message_count": message_count, "updated_at": _now()}, {"session_id": session_id})


def _session_summary(session_id: str, settings: AgentSettings) -> str:
    rows = supa_select(settings, "chat_sessions", {"session_id": session_id}, select="summary", limit=1)
    if not rows:
        return ""
    return str(rows[0].get("summary") or "").strip()


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


def _text_key(value: str) -> str:
    return _compact_text(value).casefold()


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
