from __future__ import annotations

from dataclasses import dataclass
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
) -> ChatResult:
    active_settings = settings or load_agent_settings()
    evidence: list[SearchHit] = []
    use_context = force_report_context or should_use_report_context(message, active_settings)
    if use_context:
        evidence = search_reports(message, limit=active_settings.chat_evidence_limit, settings=active_settings)
    messages = build_chat_messages(message, active_settings, history or [], evidence)
    text, model = call_chat_model(messages, active_settings)
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
        vectors = np.asarray(embed_texts([text, report_text, casual_text], active_settings).vectors, dtype=np.float32)
    except Exception:
        return False
    if vectors.ndim != 2 or vectors.shape[0] < 3:
        return False
    query = vectors[0]
    report_score = float(np.dot(query, vectors[1]))
    casual_score = float(np.dot(query, vectors[2]))
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


def call_chat_model(messages: list[dict[str, str]], settings: AgentSettings) -> tuple[str, str]:
    try:
        from openai import APIError, APITimeoutError, OpenAI, RateLimitError
    except ImportError:
        return "The OpenAI client package is missing, so I cannot reach NVIDIA chat yet.", "unavailable"
    if not settings.nvidia_api_key:
        return "NVIDIA_API_KEY is missing, so I cannot use the chat model yet.", "unavailable"
    client = OpenAI(
        api_key=settings.nvidia_api_key,
        base_url=settings.nvidia_base_url,
        timeout=settings.chat_timeout_seconds,
        max_retries=1,
    )
    models = [settings.chat_model]
    if settings.chat_fallback_model and settings.chat_fallback_model not in models:
        models.append(settings.chat_fallback_model)
    errors: list[str] = []
    for model in models:
        try:
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
