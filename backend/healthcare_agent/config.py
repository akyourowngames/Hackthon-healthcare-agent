from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from extractor.utils import load_environment, parse_float, parse_int, project_root, read_colon_bullets


@dataclass(frozen=True)
class AgentSettings:
    database_path: Path
    reports_dir: Path
    input_dir: Path
    default_output_dir: Path
    supported_extensions: tuple[str, ...]
    local_primary: bool
    local_model_repo: str
    local_model_file: str
    tokenizer_file: str
    cache_dir: Path
    embedding_dim: int
    max_tokens: int
    nvidia_model: str
    timeout_seconds: float
    search_limit: int
    nvidia_api_key: str
    nvidia_base_url: str
    chat_model: str
    chat_fast_model: str
    chat_report_model: str
    chat_fallback_model: str
    chat_timeout_seconds: float
    chat_max_tokens: int
    chat_temperature: float
    chat_streaming: bool
    chat_fast_lane_for_casual: bool
    chat_fast_lane_for_reports: bool
    chat_warmup_on_start: bool
    chat_history_messages: int
    chat_evidence_limit: int
    chat_report_context_min_chars: int
    chat_report_context_margin: float
    memory_enabled: bool
    memory_session_history_messages: int
    memory_recall_limit: int
    memory_context_chars: int
    memory_auto_store_turns: bool
    memory_min_text_chars: int
    memory_importance_default: float
    memory_rank_semantic_weight: float
    memory_rank_importance_weight: float
    memory_rank_overlap_weight: float
    memory_rank_session_weight: float


def load_agent_settings(path: str | Path | None = None) -> AgentSettings:
    root = project_root()
    load_environment(root)
    policy_path = Path(path).expanduser().resolve() if path else Path(__file__).with_name("agent_policy.md")
    values = _policy_values(policy_path)
    return AgentSettings(
        database_path=_path_value("VAIDY_AGENT_DATABASE_PATH", values["storage.database_path"], root),
        reports_dir=_path_value("VAIDY_AGENT_REPORTS_DIR", values["storage.reports_dir"], root),
        input_dir=_path_value("VAIDY_AGENT_INPUT_DIR", values["storage.input_dir"], root),
        default_output_dir=_path_value("VAIDY_AGENT_OUTPUT_DIR", values["storage.default_output_dir"], root),
        supported_extensions=_extension_values("VAIDY_AGENT_SUPPORTED_EXTENSIONS", values["storage.supported_extensions"]),
        local_primary=_bool_value("VAIDY_EMBEDDINGS_LOCAL_PRIMARY", values["embeddings.local_primary"]),
        local_model_repo=_env_value("VAIDY_ONNX_MODEL_REPO", values["embeddings.local_model_repo"]),
        local_model_file=_env_value("VAIDY_ONNX_MODEL_FILE", values["embeddings.local_model_file"]),
        tokenizer_file=_env_value("VAIDY_ONNX_TOKENIZER_FILE", values["embeddings.tokenizer_file"]),
        cache_dir=_path_value("VAIDY_ONNX_CACHE_DIR", values["embeddings.cache_dir"], root),
        embedding_dim=parse_int(_env_value("VAIDY_EMBEDDING_DIM", values["embeddings.embedding_dim"])),
        max_tokens=parse_int(_env_value("VAIDY_EMBEDDING_MAX_TOKENS", values["embeddings.max_tokens"])),
        nvidia_model=_env_value("NVIDIA_EMBEDDING_MODEL", values["embeddings.nvidia_model"]),
        timeout_seconds=parse_float(_env_value("VAIDY_EMBEDDING_TIMEOUT_SECONDS", values["embeddings.timeout_seconds"])),
        search_limit=parse_int(_env_value("VAIDY_AGENT_SEARCH_LIMIT", values["embeddings.search_limit"])),
        nvidia_api_key=os.getenv("NVIDIA_API_KEY", ""),
        nvidia_base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
        chat_model=_first_env_value(("VAIDY_CHAT_MODEL", "NVIDIA_CHAT_MODEL"), values["chat.model"]),
        chat_fast_model=_first_env_value(("VAIDY_CHAT_FAST_MODEL", "NVIDIA_FAST_MODEL"), values["chat.fast_model"]),
        chat_report_model=_first_env_value(("VAIDY_CHAT_REPORT_MODEL", "NVIDIA_REPORT_MODEL"), values["chat.report_model"]),
        chat_fallback_model=_first_env_value(("VAIDY_CHAT_FALLBACK_MODEL", "NVIDIA_CHAT_FALLBACK_MODEL"), values["chat.fallback_model"]),
        chat_timeout_seconds=parse_float(_env_value("VAIDY_CHAT_TIMEOUT_SECONDS", values["chat.timeout_seconds"])),
        chat_max_tokens=parse_int(_env_value("VAIDY_CHAT_MAX_TOKENS", values["chat.max_tokens"])),
        chat_temperature=parse_float(_env_value("VAIDY_CHAT_TEMPERATURE", values["chat.temperature"])),
        chat_streaming=_bool_value("VAIDY_CHAT_STREAMING", values["chat.streaming"]),
        chat_fast_lane_for_casual=_bool_value("VAIDY_CHAT_FAST_LANE_FOR_CASUAL", values["chat.fast_lane_for_casual"]),
        chat_fast_lane_for_reports=_bool_value("VAIDY_CHAT_FAST_LANE_FOR_REPORTS", values["chat.fast_lane_for_reports"]),
        chat_warmup_on_start=_bool_value("VAIDY_CHAT_WARMUP_ON_START", values["chat.warmup_on_start"]),
        chat_history_messages=parse_int(_env_value("VAIDY_CHAT_HISTORY_MESSAGES", values["chat.history_messages"])),
        chat_evidence_limit=parse_int(_env_value("VAIDY_CHAT_EVIDENCE_LIMIT", values["chat.evidence_limit"])),
        chat_report_context_min_chars=parse_int(_env_value("VAIDY_CHAT_REPORT_CONTEXT_MIN_CHARS", values["chat.report_context_min_chars"])),
        chat_report_context_margin=parse_float(_env_value("VAIDY_CHAT_REPORT_CONTEXT_MARGIN", values["chat.report_context_margin"])),
        memory_enabled=_bool_value("VAIDY_MEMORY_ENABLED", values["memory.enabled"]),
        memory_session_history_messages=parse_int(_env_value("VAIDY_MEMORY_SESSION_HISTORY_MESSAGES", values["memory.session_history_messages"])),
        memory_recall_limit=parse_int(_env_value("VAIDY_MEMORY_RECALL_LIMIT", values["memory.recall_limit"])),
        memory_context_chars=parse_int(_env_value("VAIDY_MEMORY_CONTEXT_CHARS", values["memory.context_chars"])),
        memory_auto_store_turns=_bool_value("VAIDY_MEMORY_AUTO_STORE_TURNS", values["memory.auto_store_turns"]),
        memory_min_text_chars=parse_int(_env_value("VAIDY_MEMORY_MIN_TEXT_CHARS", values["memory.min_text_chars"])),
        memory_importance_default=parse_float(_env_value("VAIDY_MEMORY_IMPORTANCE_DEFAULT", values["memory.importance_default"])),
        memory_rank_semantic_weight=parse_float(_env_value("VAIDY_MEMORY_RANK_SEMANTIC_WEIGHT", values["memory.rank_semantic_weight"])),
        memory_rank_importance_weight=parse_float(_env_value("VAIDY_MEMORY_RANK_IMPORTANCE_WEIGHT", values["memory.rank_importance_weight"])),
        memory_rank_overlap_weight=parse_float(_env_value("VAIDY_MEMORY_RANK_OVERLAP_WEIGHT", values["memory.rank_overlap_weight"])),
        memory_rank_session_weight=parse_float(_env_value("VAIDY_MEMORY_RANK_SESSION_WEIGHT", values["memory.rank_session_weight"])),
    )


def _policy_values(path: Path) -> dict[str, str]:
    entries = read_colon_bullets(path, {"Storage", "Embeddings", "Chat", "Memory"})
    values: dict[str, str] = {}
    for key, value, section in entries:
        values[f"{section}.{key.strip().lower()}"] = value
    return values


def _env_value(name: str, fallback: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        return fallback
    return value.strip()


def _first_env_value(names: tuple[str, ...], fallback: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    return fallback


def _bool_value(name: str, fallback: str) -> bool:
    value = _env_value(name, fallback).strip().lower()
    return value in {"1", "true", "yes", "on"}


def _extension_values(name: str, fallback: str) -> tuple[str, ...]:
    raw_value = _env_value(name, fallback)
    values: list[str] = []
    for separator in (",", ";"):
        raw_value = raw_value.replace(separator, "|")
    for item in raw_value.split("|"):
        extension = item.strip().lower()
        if not extension:
            continue
        if not extension.startswith("."):
            extension = "." + extension
        values.append(extension)
    return tuple(dict.fromkeys(values))


def _path_value(name: str, fallback: str, root: Path) -> Path:
    raw_value = _env_value(name, fallback)
    path = Path(raw_value).expanduser()
    if not path.is_absolute():
        path = root / path
    return path.resolve()
