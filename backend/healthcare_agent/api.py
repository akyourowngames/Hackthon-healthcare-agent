from __future__ import annotations

import json
import os
import queue
import threading
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from extractor.utils import parse_float, parse_int, read_colon_bullets

from .chat import ChatResult, chat_response, warm_chat_model
from .config import AgentSettings, load_agent_settings
from .ingest import InputProcessSummary, ensure_agent_folders, process_input_folder
from .memory import (
    ensure_session,
    initialize_memory,
    list_memory_entries,
    memory_assessment,
    recall_memories,
    recent_session_messages,
    remember_text,
)
from .store import get_report, initialize_database, list_reports, search_reports


@dataclass(frozen=True)
class ApiSettings:
    host: str
    port: int
    cors_origins: tuple[str, ...]
    stream_keepalive_seconds: float
    warmup_on_start: bool


class ChatMessage(BaseModel):
    role: str = Field(default="user")
    content: str = Field(default="")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    force_report_context: bool = False
    session_id: str = ""


class ProcessInputRequest(BaseModel):
    local_only: bool = False


class RememberRequest(BaseModel):
    text: str = Field(min_length=1)
    source: str = "manual"
    session_id: str = ""
    importance: float | None = None


def create_app() -> FastAPI:
    api_settings = load_api_settings()
    agent_settings = load_agent_settings()
    ensure_agent_folders(agent_settings)
    initialize_database(agent_settings)
    initialize_memory(agent_settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if api_settings.warmup_on_start and agent_settings.chat_warmup_on_start:
            threading.Thread(target=warm_chat_model, args=(agent_settings,), daemon=True).start()
        yield

    app = FastAPI(
        title="Vaidy Healthcare Agent API",
        version="0.1.0",
        description="Local API wrapper for the Vaidy report-memory agent.",
        lifespan=lifespan,
    )
    app.state.api_settings = api_settings
    app.state.agent_settings = agent_settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(api_settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {
            "ok": True,
            "database_path": str(settings.database_path),
            "input_dir": str(settings.input_dir),
            "output_dir": str(settings.default_output_dir),
        }

    @app.get("/api/status")
    def status() -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        reports = list_reports(settings)
        return {
            "ok": True,
            "report_count": len(reports),
            "input_dir": str(settings.input_dir),
            "output_dir": str(settings.default_output_dir),
            "reports_dir": str(settings.reports_dir),
            "database_path": str(settings.database_path),
            "chat_model": settings.chat_model,
            "chat_fast_model": settings.chat_fast_model,
            "chat_report_model": settings.chat_report_model,
            "chat_streaming": settings.chat_streaming,
            "supported_extensions": list(settings.supported_extensions),
            "memory": memory_assessment(settings),
        }

    @app.post("/api/process-input")
    def process_input(request: ProcessInputRequest) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        summary = process_input_folder(settings, local_only=request.local_only)
        return serialize_process_summary(summary)

    @app.get("/api/reports")
    def reports() -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {"reports": list_reports(settings)}

    @app.get("/api/reports/{report_id}")
    def report(report_id: int) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        record = get_report(report_id, settings)
        if record is None:
            raise HTTPException(status_code=404, detail="Report not found")
        return record

    @app.get("/api/search")
    def search(q: str = Query(min_length=1), limit: int | None = None) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        hits = search_reports(q, limit=limit, settings=settings)
        return {"hits": [serialize_hit(hit) for hit in hits]}

    @app.post("/api/chat")
    def chat(request: ChatRequest) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        result = chat_response(
            request.message,
            settings=settings,
            history=clean_history(request.history),
            force_report_context=request.force_report_context,
            session_id=request.session_id,
        )
        return serialize_chat_result(result)

    @app.post("/api/chat/stream")
    def chat_stream(request: ChatRequest) -> StreamingResponse:
        settings: AgentSettings = app.state.agent_settings
        generator = stream_chat_response(request, settings, api_settings)
        return StreamingResponse(generator, media_type="text/event-stream")

    @app.get("/api/memory/status")
    def memory_status() -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return memory_assessment(settings)

    @app.get("/api/memory")
    def memory_list(limit: int = 50) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {"entries": list_memory_entries(limit, settings)}

    @app.get("/api/memory/recall")
    def memory_recall(
        q: str = Query(min_length=1),
        session_id: str = "",
        limit: int | None = None,
    ) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        hits = recall_memories(q, session_id=session_id, limit=limit, settings=settings)
        return {"hits": [serialize_memory_hit(hit) for hit in hits]}

    @app.post("/api/memory/remember")
    def memory_remember(request: RememberRequest) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        result = remember_text(
            request.text,
            source=request.source,
            session_id=request.session_id,
            importance=request.importance,
            settings=settings,
        )
        return result

    @app.get("/api/sessions/{session_id}/messages")
    def session_messages(session_id: str, limit: int | None = None) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {"messages": recent_session_messages(session_id, limit=limit, settings=settings)}

    return app


def stream_chat_response(
    request: ChatRequest,
    settings: AgentSettings,
    api_settings: ApiSettings,
) -> Iterable[str]:
    events: queue.Queue[dict[str, Any]] = queue.Queue()
    history = clean_history(request.history)
    session_id = ensure_session(request.session_id, settings) if settings.memory_enabled else request.session_id.strip()

    def publish(event: str, payload: dict[str, Any]) -> None:
        events.put({"event": event, "payload": payload})

    def on_chunk(chunk: str) -> None:
        publish("chunk", {"text": chunk})

    def worker() -> None:
        try:
            result = chat_response(
                request.message,
                settings=settings,
                history=history,
                force_report_context=request.force_report_context,
                on_chunk=on_chunk,
                session_id=session_id,
            )
            publish("done", serialize_chat_result(result))
        except Exception as exc:
            publish("error", {"message": str(exc)})
        finally:
            publish("close", {})

    publish("meta", {"status": "thinking", "streaming": True, "session_id": session_id})
    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    last_event = time.monotonic()
    while True:
        timeout = max(0.2, api_settings.stream_keepalive_seconds)
        try:
            item = events.get(timeout=timeout)
        except queue.Empty:
            yield sse_event("ping", {"time": time.time()})
            last_event = time.monotonic()
            continue
        event_name = str(item.get("event") or "message")
        payload = item.get("payload") or {}
        if event_name == "close":
            break
        yield sse_event(event_name, payload)
        last_event = time.monotonic()
    if time.monotonic() - last_event >= api_settings.stream_keepalive_seconds:
        yield sse_event("ping", {"time": time.time()})


def sse_event(event: str, payload: dict[str, Any]) -> str:
    data = json.dumps(payload, ensure_ascii=False)
    return f"event: {event}\ndata: {data}\n\n"


def clean_history(history: list[ChatMessage]) -> list[dict[str, str]]:
    cleaned: list[dict[str, str]] = []
    for item in history:
        role = item.role.strip().lower()
        content = item.content.strip()
        if role not in {"user", "assistant"}:
            continue
        if not content:
            continue
        cleaned.append({"role": role, "content": content})
    return cleaned


def serialize_chat_result(result: ChatResult) -> dict[str, Any]:
    return {
        "text": result.text,
        "used_report_context": result.used_report_context,
        "model": result.model,
        "evidence": [serialize_hit(hit) for hit in result.evidence],
        "memory": result.memory,
        "session_id": result.session_id,
    }


def serialize_memory_hit(hit) -> dict[str, Any]:
    return {
        "id": hit.id,
        "text": hit.text,
        "score": hit.score,
        "source": hit.source,
        "session_id": hit.session_id,
        "importance": hit.importance,
        "created_at": hit.created_at,
        "last_seen_at": hit.last_seen_at,
        "access_count": hit.access_count,
    }


def serialize_hit(hit) -> dict[str, Any]:
    return {
        "report_id": hit.report_id,
        "chunk_id": hit.chunk_id,
        "score": hit.score,
        "text": hit.text,
        "patient_name": hit.patient_name,
        "report_date": hit.report_date,
        "lab_name": hit.lab_name,
    }


def serialize_process_summary(summary: InputProcessSummary) -> dict[str, Any]:
    return {
        "input_dir": str(summary.input_dir),
        "output_dir": str(summary.output_dir),
        "touched": summary.touched,
        "processed": summary.processed,
        "skipped": summary.skipped,
        "failed": summary.failed,
    }


def load_api_settings(path: str | Path | None = None) -> ApiSettings:
    policy_path = Path(path).expanduser().resolve() if path else Path(__file__).with_name("api_policy.md")
    values = api_policy_values(policy_path)
    host = env_value("VAIDY_API_HOST", values["server.host"])
    port = parse_int(env_value("VAIDY_API_PORT", values["server.port"]))
    origins = origin_values(env_value("VAIDY_API_CORS_ORIGINS", values["server.cors_origins"]))
    keepalive = parse_float(env_value("VAIDY_API_STREAM_KEEPALIVE_SECONDS", values["server.stream_keepalive_seconds"]))
    warmup = bool_value("VAIDY_API_WARMUP_ON_START", values["server.warmup_on_start"])
    return ApiSettings(
        host=host,
        port=port,
        cors_origins=origins,
        stream_keepalive_seconds=keepalive,
        warmup_on_start=warmup,
    )


def api_policy_values(path: Path) -> dict[str, str]:
    entries = read_colon_bullets(path, {"Server"})
    values: dict[str, str] = {}
    for key, value, section in entries:
        values[f"{section}.{key.strip().lower()}"] = value
    return values


def env_value(name: str, fallback: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        return fallback
    return value.strip()


def bool_value(name: str, fallback: str) -> bool:
    value = env_value(name, fallback).strip().lower()
    return value in {"1", "true", "yes", "on"}


def origin_values(raw_value: str) -> tuple[str, ...]:
    normalized = raw_value
    for separator in (",", ";"):
        normalized = normalized.replace(separator, "|")
    origins = []
    for item in normalized.split("|"):
        origin = item.strip()
        if origin:
            origins.append(origin)
    return tuple(dict.fromkeys(origins))


app = create_app()


def main() -> int:
    import uvicorn

    settings = load_api_settings()
    uvicorn.run("healthcare_agent.api:app", host=settings.host, port=settings.port, reload=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
