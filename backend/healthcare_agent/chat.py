from __future__ import annotations

from dataclasses import dataclass, replace
from functools import lru_cache
from pathlib import Path

import numpy as np

from .config import AgentSettings, load_agent_settings
from .embedder import embed_texts
from .store import SearchHit, search_reports


@dataclass(frozen=True)
class ChatResult:
    text: str
    used_report_context: bool
    model: str
    evidence: list[SearchHit]


def chat_response(
    message: str,
    settings: AgentSettings | None = None,
    history: list[dict[str, str]] | None = None,
    force_report_context: bool = False,
    on_chunk=None,
) -> ChatResult:
    active_settings = settings or load_agent_settings()
    evidence: list[SearchHit] = []
    use_context = force_report_context or should_use_report_context(message, active_settings)
    if use_context:
        evidence = search_reports(message, limit=active_settings.chat_evidence_limit, settings=active_settings)
    messages = build_chat_messages(message, active_settings, history or [], evidence)
    selected_model = select_chat_model(active_settings, use_context)
    text, model = call_chat_model(messages, active_settings, on_chunk=on_chunk, model=selected_model)
    return ChatResult(text=text, used_report_context=bool(evidence), model=model, evidence=evidence)


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
) -> list[dict[str, str]]:
    policy = load_chat_policy()
    system_parts = [policy.get("persona", "You are Vaidy, a helpful health assistant.")]
    if evidence:
        system_parts.append("Use the local report evidence below when answering this turn.")
        system_parts.append(format_evidence(evidence))
    else:
        system_parts.append("No local report evidence is attached for this turn. Chat naturally.")
    messages = [{"role": "system", "content": "\n\n".join(system_parts)}]
    messages.extend(history[-settings.chat_history_messages :])
    messages.append({"role": "user", "content": message})
    return messages


def select_chat_model(settings: AgentSettings, use_report_context: bool) -> str:
    if use_report_context and settings.chat_fast_lane_for_reports and settings.chat_report_model:
        return settings.chat_report_model
    if not use_report_context and settings.chat_fast_lane_for_casual and settings.chat_fast_model:
        return settings.chat_fast_model
    return settings.chat_model


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
