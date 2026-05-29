from __future__ import annotations

from dataclasses import dataclass, field, replace
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from .config import AgentSettings, load_agent_settings
from .embedder import embed_texts
from .fast_agent import fast_agent_answer
from .language import detect_language, language_instruction
from .memory import (
    ensure_session,
    fresh_session_report,
    memory_context,
    remember_turn,
    save_chat_message,
)
from .store import SearchHit, get_report, health_context_for_query, search_reports


@dataclass(frozen=True)
class ChatResult:
    text: str
    used_report_context: bool
    model: str
    evidence: list[SearchHit]
    memory: list[dict[str, object]] = field(default_factory=list)
    session_id: str = ""
    language: str = "en"
    retrieval_intent: str = ""


def chat_response(
    message: str,
    settings: AgentSettings | None = None,
    history: list[dict[str, str]] | None = None,
    force_report_context: bool = False,
    on_chunk=None,
    session_id: str | None = None,
    language_preference: str = "auto",
) -> ChatResult:
    active_settings = settings or load_agent_settings()
    active_session_id = ensure_session(session_id, active_settings) if active_settings.memory_enabled else ""
    fresh_report = _resolve_fresh_report(active_session_id, active_settings)
    if not fresh_report:
        fast_answer = fast_agent_answer(message, active_settings, language_preference)
        if fast_answer:
            if active_session_id:
                save_chat_message(active_session_id, "user", message, active_settings)
                save_chat_message(active_session_id, "assistant", fast_answer, active_settings)
            return ChatResult(
                text=fast_answer,
                used_report_context=True,
                model="local-fast",
                evidence=[],
                session_id=active_session_id,
                language=detect_language(message, language_preference),
                retrieval_intent="local_fast",
            )
    evidence: list[SearchHit] = []
    memory_payload: dict[str, object] = {"context": "", "hits": [], "history_messages": []}
    conversation_history = history or []
    if active_settings.memory_enabled:
        memory_payload = memory_context(message, active_session_id, active_settings)
        saved_history = memory_payload.get("history_messages")
        if isinstance(saved_history, list) and saved_history:
            conversation_history = saved_history
    use_context = (
        force_report_context
        or bool(fresh_report)
        or should_use_report_context(message, active_settings)
    )
    retrieval_intent = ""
    health_context_text = ""
    if use_context:
        retrieval_intent = classify_retrieval_intent(message, active_settings) if not fresh_report else "fresh_upload"
        health_context_text = health_context_for_query(
            message,
            retrieval_intent if retrieval_intent != "fresh_upload" else "general_health",
            active_settings.default_user_id,
            active_settings,
        )
        if retrieval_intent in {"report_comparison", "other"} or not health_context_text:
            evidence = search_reports(message, limit=active_settings.chat_evidence_limit, settings=active_settings)
    memory_context_text = str(memory_payload.get("context") or "")
    language = detect_language(message, language_preference)
    fresh_block = _format_fresh_report_block(fresh_report, active_settings) if fresh_report else ""
    messages = build_chat_messages(
        message,
        active_settings,
        conversation_history,
        evidence,
        memory_context_text,
        health_context_text,
        language,
        language_preference,
        fresh_block=fresh_block,
    )
    selected_model = select_chat_model(active_settings, use_context)
    text, model = call_chat_model(messages, active_settings, on_chunk=on_chunk, model=selected_model)
    memory_hits = memory_payload.get("hits")
    if not isinstance(memory_hits, list):
        memory_hits = []
    if model == "unavailable":
        fallback_text = local_fallback_answer(evidence, memory_hits, fresh_block)
        if fallback_text:
            text = fallback_text
    if active_session_id and model == "unavailable":
        save_chat_message(active_session_id, "user", message, active_settings)
        save_chat_message(active_session_id, "assistant", text, active_settings)
    elif active_session_id:
        remember_turn(active_session_id, message, text, active_settings)
    return ChatResult(
        text=text,
        used_report_context=bool(evidence or health_context_text or fresh_report),
        model=model,
        evidence=evidence,
        memory=memory_hits,
        session_id=active_session_id,
        language=language,
        retrieval_intent=retrieval_intent,
    )


def should_use_report_context(message: str, settings: AgentSettings | None = None) -> bool:
    active_settings = settings or load_agent_settings()
    text = str(message or "").strip()
    if len(text) < active_settings.chat_report_context_min_chars:
        return False
    policy = load_chat_policy()
    report_text = policy.get("report_context_intent", "")
    casual_text = policy.get("casual_chat_intent", "")
    if not report_text or not casual_text:
        return False
    try:
        policy_vectors = intent_policy_vectors(active_settings, report_text, casual_text)
        query_vector = np.asarray(embed_texts(text, active_settings).vectors, dtype=np.float32).reshape(-1)
    except Exception:
        return False
    if policy_vectors.ndim != 2 or policy_vectors.shape[0] < 2:
        return False
    query, report_vector = align_pair(query_vector, policy_vectors[0])
    query, casual_vector = align_pair(query, policy_vectors[1])
    report_score = float(np.dot(query, report_vector))
    casual_score = float(np.dot(query, casual_vector))
    return report_score >= casual_score + active_settings.chat_report_context_margin


def build_chat_messages(
    message: str,
    settings: AgentSettings,
    history: list[dict[str, str]],
    evidence: list[SearchHit],
    memory_context_text: str = "",
    health_context_text: str = "",
    language: str = "en",
    language_preference: str = "auto",
    fresh_block: str = "",
) -> list[dict[str, str]]:
    policy = load_chat_policy()
    system_parts = [policy.get("persona", "You are Vaidy, a helpful health assistant.")]
    system_parts.append(language_instruction(language, language_preference))
    if fresh_block:
        header = policy.get("fresh_upload_header", "A new report is attached to this conversation.")
        system_parts.append(header)
        system_parts.append(fresh_block)
    if memory_context_text:
        system_parts.append("Persistent memory for this user:")
        system_parts.append(memory_context_text)
    if health_context_text:
        system_parts.append("Structured health timeline context:")
        system_parts.append(health_context_text)
    if evidence:
        system_parts.append("Use the local report evidence below when answering this turn.")
        system_parts.append(format_evidence(evidence))
    elif not health_context_text and not fresh_block:
        system_parts.append("No local report evidence is attached for this turn. Chat naturally.")
    messages = [{"role": "system", "content": "\n\n".join(system_parts)}]
    messages.extend(history[-settings.chat_history_messages :])
    messages.append({"role": "user", "content": message})
    return messages


def local_fallback_answer(
    evidence: list[SearchHit],
    memory_hits: list[dict[str, object]],
    fresh_block: str = "",
) -> str:
    lines: list[str] = []
    if fresh_block:
        lines.append("I cannot reach the chat model right now, but here is what I extracted from the report you just uploaded:")
        lines.append(fresh_block)
    if memory_hits:
        if not lines:
            lines.append("I cannot reach the chat model right now, but I did find saved memory for this turn:")
        else:
            lines.append("Saved memory also matches this turn:")
        for hit in memory_hits[:4]:
            text = str(hit.get("text") or "").strip()
            if text:
                lines.append(f"- {text}")
    if evidence:
        if not lines:
            lines.append("I cannot reach the chat model right now, but I did find local report evidence:")
        else:
            lines.append("Local report evidence also matches:")
        for hit in evidence[:4]:
            lines.append(f"- report {hit.report_id}: {hit.text}")
        lines.append("This is report evidence, not a diagnosis.")
    if lines:
        return "\n".join(lines)
    return ""


def _resolve_fresh_report(
    session_id: str,
    settings: AgentSettings,
) -> dict[str, Any] | None:
    if not session_id:
        return None
    fresh = fresh_session_report(session_id, settings)
    if not fresh:
        return None
    record = get_report(int(fresh["report_id"]), settings)
    if record is None:
        return None
    return {**fresh, "record": record}


def _format_fresh_report_block(
    fresh: dict[str, Any] | None,
    settings: AgentSettings,
) -> str:
    if not fresh:
        return ""
    record = fresh.get("record") or {}
    payload = record.get("report") if isinstance(record.get("report"), dict) else {}
    lines: list[str] = []
    header_parts = [f"report id {record.get('id') or fresh.get('report_id')}"]
    patient = str(record.get("patient_name") or payload.get("patient_name") or "").strip()
    date = str(record.get("report_date") or payload.get("report_date") or "").strip()
    lab = str(record.get("lab_name") or payload.get("lab_name") or "").strip()
    status = str(record.get("report_status") or payload.get("report_status") or "").strip()
    if patient:
        header_parts.append(f"patient {patient}")
    if date:
        header_parts.append(f"date {date}")
    if lab:
        header_parts.append(f"lab {lab}")
    if status:
        header_parts.append(f"status {status}")
    lines.append("Fresh upload metadata: " + ", ".join(header_parts))
    summary = str(payload.get("summary") or "").strip()
    if summary:
        lines.append(f"One-line summary: {summary}")
    modality = str(payload.get("modality") or "").strip()
    region = str(payload.get("body_region") or "").strip()
    if modality or region:
        lines.append(
            "Modality: " + (modality or "unknown")
            + ("; body region: " + region if region else "")
        )
    findings = payload.get("findings") if isinstance(payload.get("findings"), list) else []
    if findings:
        lines.append("Findings extracted from this upload:")
        for finding in findings[:10]:
            if not isinstance(finding, dict):
                continue
            title = str(finding.get("title") or "finding").strip()
            detail = str(finding.get("detail") or "").strip()
            severity = str(finding.get("severity") or "").strip()
            suffix = f" ({severity})" if severity else ""
            if detail:
                lines.append(f"- {title}{suffix}: {detail}")
            else:
                lines.append(f"- {title}{suffix}")
    biomarkers = payload.get("biomarkers") if isinstance(payload.get("biomarkers"), dict) else {}
    if biomarkers:
        lines.append("Biomarkers extracted from this upload:")
        for index, (name, item) in enumerate(biomarkers.items()):
            if index >= 24:
                lines.append(f"- ...and {len(biomarkers) - index} more biomarker(s).")
                break
            if not isinstance(item, dict):
                continue
            value = item.get("value")
            unit = str(item.get("unit") or "").strip()
            ref = str(item.get("ref_range") or "").strip()
            flag = str(item.get("flag") or "").strip()
            parts = [str(name)]
            if value is not None:
                parts.append(str(value))
            if unit:
                parts.append(unit)
            if ref:
                parts.append(f"ref {ref}")
            if flag:
                parts.append(f"flag {flag}")
            lines.append("- " + " ".join(parts))
    if not findings and not biomarkers and not summary:
        lines.append(
            "No structured findings or biomarkers were extracted yet. The agent should acknowledge "
            "the upload, mention the file is stored, and offer to retry analysis."
        )
    age = float(fresh.get("age_seconds") or 0)
    window = max(1, int(settings.fresh_upload_window_seconds))
    lines.append(f"Upload was {int(age)}s ago; freshness window is {window}s.")
    return "\n".join(lines)


def select_chat_model(settings: AgentSettings, use_report_context: bool) -> str:
    if use_report_context and settings.chat_fast_lane_for_reports and settings.chat_report_model:
        return settings.chat_report_model
    if not use_report_context and settings.chat_fast_lane_for_casual and settings.chat_fast_model:
        return settings.chat_fast_model
    return settings.chat_model


def classify_retrieval_intent(message: str, settings: AgentSettings | None = None) -> str:
    active_settings = settings or load_agent_settings()
    text = str(message or "").strip()
    if not text:
        return "other"
    policy = load_chat_policy()
    labels = [
        "specific_biomarker",
        "trend_question",
        "general_health",
        "report_comparison",
        "other",
    ]
    descriptions = [
        policy.get("specific_biomarker_intent", ""),
        policy.get("trend_question_intent", ""),
        policy.get("general_health_intent", ""),
        policy.get("report_comparison_intent", ""),
        policy.get("other_intent", ""),
    ]
    if not all(descriptions):
        return "other"
    try:
        vectors = embed_texts([text, *descriptions], active_settings).vectors
        matrix = np.asarray(vectors, dtype=np.float32)
    except Exception:
        return "other"
    if matrix.ndim != 2 or matrix.shape[0] < len(labels) + 1:
        return "other"
    query = matrix[0]
    best_label = "other"
    best_score = -1.0
    for index, label in enumerate(labels, start=1):
        aligned_query, aligned_policy = align_pair(query, matrix[index])
        score = float(np.dot(aligned_query, aligned_policy))
        if score > best_score:
            best_score = score
            best_label = label
    return best_label


def call_chat_model(
    messages: list[dict[str, str]],
    settings: AgentSettings,
    on_chunk=None,
    model: str | None = None,
) -> tuple[str, str]:
    try:
        from openai import APIError, APITimeoutError, RateLimitError
    except ImportError:
        return "The OpenAI client package is missing, so I cannot reach NVIDIA chat yet.", "unavailable"
    if not settings.nvidia_api_key:
        return "NVIDIA_API_KEY is missing, so I cannot use the chat model yet.", "unavailable"
    client = chat_client(settings.nvidia_api_key, settings.nvidia_base_url, settings.chat_timeout_seconds)
    models = [model or settings.chat_model]
    if settings.chat_fallback_model and settings.chat_fallback_model not in models:
        models.append(settings.chat_fallback_model)
    errors: list[str] = []
    for model in models:
        try:
            if settings.chat_streaming and on_chunk is not None:
                content = stream_chat_completion(client, model, messages, settings, on_chunk)
            else:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=settings.chat_temperature,
                    max_tokens=settings.chat_max_tokens,
                )
                content = response.choices[0].message.content or ""
            return content.strip() or "I am here.", model
        except (APIError, APITimeoutError, RateLimitError) as exc:
            errors.append(f"{model}: {exc.__class__.__name__}")
    return "NVIDIA chat failed: " + "; ".join(errors), "unavailable"


@lru_cache(maxsize=4)
def chat_client(api_key: str, base_url: str, timeout_seconds: float):
    from openai import OpenAI

    return OpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=timeout_seconds,
        max_retries=1,
    )


def warm_chat_model(settings: AgentSettings | None = None) -> None:
    active_settings = settings or load_agent_settings()
    if not active_settings.nvidia_api_key:
        return
    warm_settings = replace(
        active_settings,
        chat_model=active_settings.chat_fast_model or active_settings.chat_model,
        chat_fallback_model="",
        chat_max_tokens=min(active_settings.chat_max_tokens, 12),
        chat_streaming=False,
    )
    messages = [{"role": "user", "content": "Reply with only ok."}]
    call_chat_model(messages, warm_settings, model=warm_settings.chat_model)


def stream_chat_completion(client, model: str, messages: list[dict[str, str]], settings: AgentSettings, on_chunk) -> str:
    chunks: list[str] = []
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=settings.chat_temperature,
        max_tokens=settings.chat_max_tokens,
        stream=True,
    )
    for event in stream:
        if not event.choices:
            continue
        delta = event.choices[0].delta
        chunk = getattr(delta, "content", None)
        if not chunk:
            continue
        text = str(chunk)
        chunks.append(text)
        on_chunk(text)
    return "".join(chunks)


@lru_cache(maxsize=8)
def intent_policy_vectors(settings: AgentSettings, report_text: str, casual_text: str) -> np.ndarray:
    vectors = embed_texts([report_text, casual_text], settings).vectors
    return np.asarray(vectors, dtype=np.float32)


def align_pair(first: np.ndarray, second: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    a = np.asarray(first, dtype=np.float32).reshape(-1)
    b = np.asarray(second, dtype=np.float32).reshape(-1)
    if a.shape[0] == b.shape[0]:
        return a, b
    dim = max(a.shape[0], b.shape[0])
    return pad_vector(a, dim), pad_vector(b, dim)


def pad_vector(vector: np.ndarray, dim: int) -> np.ndarray:
    if vector.shape[0] >= dim:
        return vector[:dim]
    return np.pad(vector, (0, dim - vector.shape[0]))


def format_evidence(hits: list[SearchHit]) -> str:
    lines = ["Local report evidence:"]
    for hit in hits:
        label_parts = [f"report {hit.report_id}"]
        if hit.patient_name:
            label_parts.append(hit.patient_name)
        if hit.report_date:
            label_parts.append(hit.report_date)
        if hit.lab_name:
            label_parts.append(hit.lab_name)
        lines.append(f"- {' | '.join(label_parts)}: {hit.text}")
    return "\n".join(lines)


@lru_cache(maxsize=1)
def load_chat_policy() -> dict[str, str]:
    path = Path(__file__).with_name("chat_policy.md")
    current_section = ""
    parts: dict[str, list[str]] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.startswith("## "):
            current_section = line[3:].strip().lower().replace(" ", "_")
            parts[current_section] = []
            continue
        if current_section and line:
            parts[current_section].append(line)
    return {key: " ".join(value).strip() for key, value in parts.items()}
