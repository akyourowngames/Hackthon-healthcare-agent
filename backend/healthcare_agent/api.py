from __future__ import annotations

import json
import os
import queue
import threading
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from extractor.utils import parse_float, parse_int, read_colon_bullets

from .chat import ChatResult, chat_response, warm_chat_model
from .config import AgentSettings, load_agent_settings
from .ingest import InputProcessSummary, ensure_agent_folders, process_input_folder, process_single_file
from .memory import (
    bind_session_to_report,
    clear_session_report,
    ensure_session,
    fresh_session_report,
    initialize_memory,
    list_memory_entries,
    memory_assessment,
    recall_memories,
    recent_session_messages,
    remember_text,
)
from .store import (
    biomarker_detail,
    create_share_link,
    dashboard_snapshot,
    deduplicate_reports,
    get_report,
    get_share_summary,
    initialize_database,
    list_notifications,
    list_reports,
    search_reports,
)
from .supabase_sync import supabase_status, upload_file_to_storage_async


@dataclass(frozen=True)
class ApiSettings:
    host: str
    port: int
    cors_origins: tuple[str, ...]
    stream_keepalive_seconds: float
    warmup_on_start: bool


@dataclass
class UploadJob:
    id: str
    file_path: Path
    local_only: bool
    session_id: str = ""
    user_id: str = ""
    file_label: str = ""
    events: queue.Queue[dict[str, Any]] = field(default_factory=queue.Queue)
    history: list[dict[str, Any]] = field(default_factory=list)
    done: bool = False
    result: dict[str, Any] | None = None
    error: str = ""


class ChatMessage(BaseModel):
    role: str = Field(default="user")
    content: str = Field(default="")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    force_report_context: bool = False
    session_id: str = ""
    language_preference: str = "auto"
    user_id: str = ""


class ProcessInputRequest(BaseModel):
    local_only: bool = False
    user_id: str = ""


class RememberRequest(BaseModel):
    text: str = Field(min_length=1)
    source: str = "manual"
    session_id: str = ""
    importance: float | None = None
    user_id: str = ""


class ShareRequest(BaseModel):
    user_id: str = ""
    report_ids: list[int] = Field(default_factory=list)


UPLOAD_JOBS: dict[str, UploadJob] = {}


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
    def status(session_id: str = "", user_id: str = "") -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        reports = list_reports(settings, user_id=user_id if user_id else None)
        fresh = fresh_session_report(session_id, settings) if session_id else None
        return {
            "ok": True,
            "report_count": len(reports),
            "input_dir": str(settings.input_dir),
            "output_dir": str(settings.default_output_dir),
            "reports_dir": str(settings.reports_dir),
            "database_path": str(settings.database_path),
            "default_user_id": settings.default_user_id,
            "chat_model": settings.chat_model,
            "chat_fast_model": settings.chat_fast_model,
            "chat_report_model": settings.chat_report_model,
            "chat_streaming": settings.chat_streaming,
            "supported_extensions": list(settings.supported_extensions),
            "image_extensions": list(settings.image_extensions),
            "memory": memory_assessment(settings),
            "supabase": supabase_status(settings),
            "fresh_upload": fresh,
        }

    @app.get("/api/supabase/status")
    def supabase() -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return supabase_status(settings)

    @app.post("/api/process-input")
    def process_input(request: ProcessInputRequest) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        summary = process_input_folder(settings, local_only=request.local_only, user_id=request.user_id)
        return serialize_process_summary(summary)

    @app.get("/api/reports")
    def reports(user_id: str = "") -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {"reports": list_reports(settings, user_id=user_id if user_id else None)}

    @app.get("/api/reports/{report_id}")
    def report(report_id: int, user_id: str = "") -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        record = get_report(report_id, settings)
        if record is None:
            raise HTTPException(status_code=404, detail="Report not found")
        safe_user_id = str(user_id or "").strip()
        if safe_user_id and str(record.get("user_id") or "") != safe_user_id:
            raise HTTPException(status_code=404, detail="Report not found")
        return record

    @app.post("/api/reports/deduplicate")
    def deduplicate() -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return deduplicate_reports(settings)

    @app.get("/api/dashboard/{user_id}")
    def dashboard(user_id: str) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return dashboard_snapshot(user_id, settings)

    @app.get("/api/biomarker/{user_id}/{biomarker_name}")
    def biomarker(user_id: str, biomarker_name: str) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return biomarker_detail(user_id, biomarker_name, settings)

    @app.get("/api/notifications/{user_id}")
    def notifications(user_id: str) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {"notifications": list_notifications(user_id, settings)}

    @app.get("/api/search")
    def search(q: str = Query(min_length=1), limit: int | None = None, user_id: str = "") -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        hits = search_reports(q, limit=limit, settings=settings, user_id=user_id if user_id else None)
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
            language_preference=request.language_preference,
            user_id=request.user_id,
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
    def memory_list(limit: int = 50, user_id: str = "") -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {"entries": list_memory_entries(limit, settings, user_id=user_id)}

    @app.get("/api/memory/recall")
    def memory_recall(
        q: str = Query(min_length=1),
        session_id: str = "",
        limit: int | None = None,
        user_id: str = "",
    ) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        hits = recall_memories(q, session_id=session_id, limit=limit, settings=settings, user_id=user_id)
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
            user_id=request.user_id,
        )
        return result

    @app.post("/api/share")
    def share_create(request: ShareRequest) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return create_share_link(request.user_id, request.report_ids, settings)

    @app.get("/api/share/{token}")
    def share_read(token: str) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        summary = get_share_summary(token, settings)
        if summary is None:
            raise HTTPException(status_code=404, detail="Share link not found")
        if summary.get("expired"):
            raise HTTPException(status_code=410, detail="Share link expired")
        return summary

    @app.post("/api/upload")
    async def upload(request: Request) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        form = await request.form()
        uploaded = form.get("file")
        if uploaded is None or not hasattr(uploaded, "filename"):
            raise HTTPException(status_code=400, detail="Upload a file field named file")
        filename = str(getattr(uploaded, "filename", "") or "").strip()
        if not filename:
            raise HTTPException(status_code=400, detail="Uploaded file has no name")
        local_only = _form_bool(form.get("local_only"))
        user_id = str(form.get("user_id") or "").strip()
        session_id = str(form.get("session_id") or "").strip()
        relative_path = str(form.get("relative_path") or filename).strip() or filename
        target = _upload_target(settings, filename)
        content = await uploaded.read()
        target.write_bytes(content)
        job = _start_upload_job(
            target,
            local_only,
            settings,
            user_id=user_id,
            session_id=session_id,
            file_label=relative_path,
        )
        return {
            "job_id": job.id,
            "file_path": str(target),
            "file_label": relative_path,
            "session_id": session_id,
            "progress_url": f"/api/upload/progress/{job.id}",
        }

    @app.get("/api/upload/progress/{job_id}")
    def upload_progress(job_id: str) -> StreamingResponse:
        job = UPLOAD_JOBS.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Upload job not found")
        return StreamingResponse(stream_upload_progress(job), media_type="text/event-stream")

    @app.get("/api/upload/status/{job_id}")
    def upload_status(job_id: str) -> dict[str, Any]:
        job = UPLOAD_JOBS.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Upload job not found")
        return {
            "job_id": job.id,
            "done": job.done,
            "error": job.error,
            "result": job.result,
            "file_label": job.file_label,
        }

    @app.post("/api/sessions/{session_id}/clear-active-report")
    def clear_active_report(session_id: str) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        clear_session_report(session_id, settings)
        return {"ok": True, "session_id": session_id}

    @app.get("/api/sessions/{session_id}/fresh-upload")
    def session_fresh_upload(session_id: str) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        fresh = fresh_session_report(session_id, settings)
        if fresh is None:
            return {"ok": True, "fresh_upload": None}
        record = get_report(int(fresh["report_id"]), settings)
        return {"ok": True, "fresh_upload": fresh, "report": record}

    @app.get("/api/sessions/{session_id}/messages")
    def session_messages(session_id: str, limit: int | None = None) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        return {"messages": recent_session_messages(session_id, limit=limit, settings=settings)}

    @app.post("/api/sessions/{session_id}/attach-report")
    async def attach_report(session_id: str, request: Request) -> dict[str, Any]:
        settings: AgentSettings = app.state.agent_settings
        body = await request.json()
        report_id = int(body.get("report_id") or 0)
        if report_id <= 0:
            raise HTTPException(status_code=400, detail="report_id is required")
        record = get_report(report_id, settings)
        if record is None:
            raise HTTPException(status_code=404, detail="Report not found")
        result = bind_session_to_report(session_id, report_id, settings)
        fresh = fresh_session_report(session_id, settings)
        return {
            "ok": True,
            "session_id": session_id,
            "fresh_upload": fresh,
            "report": record,
        }

    return app


def stream_chat_response(
    request: ChatRequest,
    settings: AgentSettings,
    api_settings: ApiSettings,
) -> Iterable[str]:
    events: queue.Queue[dict[str, Any]] = queue.Queue()
    history = clean_history(request.history)
    session_id = ensure_session(request.session_id, settings, user_id=request.user_id) if settings.memory_enabled else request.session_id.strip()

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
                language_preference=request.language_preference,
                user_id=request.user_id,
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
        timeout = max(0.05, min(0.5, api_settings.stream_keepalive_seconds))
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
        "language": result.language,
        "retrieval_intent": result.retrieval_intent,
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


def stream_upload_progress(job: UploadJob) -> Iterable[str]:
    while True:
        try:
            item = job.events.get(timeout=1.0)
        except queue.Empty:
            yield sse_event("ping", {"time": time.time()})
            if job.done:
                break
            continue
        event_name = str(item.get("event") or "status")
        payload = dict(item.get("payload") or {})
        yield sse_event(event_name, payload)
        if event_name in {"done", "error"}:
            break


def _start_upload_job(
    path: Path,
    local_only: bool,
    settings: AgentSettings,
    user_id: str = "",
    session_id: str = "",
    file_label: str = "",
) -> UploadJob:
    job = UploadJob(
        id=str(uuid.uuid4()),
        file_path=path,
        local_only=local_only,
        session_id=session_id,
        user_id=user_id,
        file_label=file_label or path.name,
    )
    UPLOAD_JOBS[job.id] = job
    extension = path.suffix.lower()
    is_image = extension in settings.image_extensions

    def worker() -> None:
        try:
            _publish_upload(
                job,
                "status",
                {"stage": "received", "message": f"Received {job.file_label}", "file_label": job.file_label, "is_image": is_image},
            )
            _publish_upload(
                job,
                "status",
                {"stage": "reading", "message": "Reading the file", "file_label": job.file_label, "is_image": is_image},
            )
            _publish_upload(
                job,
                "status",
                {
                    "stage": "extracting",
                    "message": "Extracting findings" if is_image else "Extracting biomarkers",
                    "file_label": job.file_label,
                    "is_image": is_image,
                },
            )
            result = process_single_file(path, settings, local_only=local_only, user_id=user_id)
            _publish_upload(
                job,
                "status",
                {"stage": "analyzing", "message": "Analyzing trends", "file_label": job.file_label, "is_image": is_image},
            )
            dashboard = dashboard_snapshot(user_id or settings.default_user_id, settings)
            result["health_score"] = dashboard.get("health_score", {})
            result["anomalies"] = list(dashboard.get("anomalies") or [])[:5]
            result["file_label"] = job.file_label
            result["is_image"] = is_image
            report_id = result.get("report_id")
            if isinstance(report_id, int) and session_id and settings.memory_enabled:
                bind_session_to_report(session_id, int(report_id), settings)
                _store_upload_memory(session_id, result, settings, user_id=user_id)
            # Upload file to Supabase Storage bucket
            upload_file_to_storage_async(path, user_id or settings.default_user_id, settings)
            job.result = result
            job.done = True
            _publish_upload(job, "done", {"stage": "done", "message": "Done", "result": result, "file_label": job.file_label})
        except Exception as exc:
            job.error = str(exc)
            job.done = True
            _publish_upload(job, "error", {"stage": "error", "message": str(exc), "file_label": job.file_label})

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    return job


def _store_upload_memory(session_id: str, result: dict[str, Any], settings: AgentSettings, user_id: str = "") -> None:
    text_parts: list[str] = ["The user just uploaded a new health document via Vaidy chat."]
    label = str(result.get("file_label") or "").strip()
    if label:
        text_parts.append(f"File: {label}.")
    kind = str(result.get("kind") or "").strip()
    if kind:
        text_parts.append(f"Kind: {kind}.")
    patient = str(result.get("patient_name") or "").strip()
    if patient:
        text_parts.append(f"Patient: {patient}.")
    date = str(result.get("report_date") or "").strip()
    if date:
        text_parts.append(f"Report date: {date}.")
    lab = str(result.get("lab_name") or "").strip()
    if lab:
        text_parts.append(f"Lab: {lab}.")
    summary = str(result.get("summary") or "").strip()
    if summary:
        text_parts.append(f"Summary: {summary}.")
    biomarkers = int(result.get("biomarkers") or 0)
    findings = int(result.get("findings") or 0)
    if biomarkers:
        text_parts.append(f"Biomarkers extracted: {biomarkers}.")
    if findings:
        text_parts.append(f"Findings extracted: {findings}.")
    score = result.get("health_score") or {}
    if isinstance(score, dict) and score.get("score") is not None:
        text_parts.append(f"Latest health score: {score.get('score')}/100.")
    anomalies = result.get("anomalies") or []
    if isinstance(anomalies, list) and anomalies:
        first = anomalies[0]
        if isinstance(first, dict):
            text_parts.append(
                "Top finding: "
                + str(first.get("severity") or "watch")
                + " "
                + str(first.get("biomarker") or "")
                + " - "
                + str(first.get("description") or "")
            )
    remember_text(
        " ".join(text_parts),
        source="upload_event",
        session_id=session_id,
        importance=float(settings.fresh_upload_importance),
        settings=settings,
        user_id=user_id,
    )


def _publish_upload(job: UploadJob, event: str, payload: dict[str, Any]) -> None:
    item = {"event": event, "payload": payload}
    job.history.append(item)
    job.events.put(item)


def _upload_target(settings: AgentSettings, filename: str) -> Path:
    settings.input_dir.mkdir(parents=True, exist_ok=True)
    source_name = Path(filename).name
    suffix = Path(source_name).suffix.lower()
    if suffix not in settings.supported_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")
    stem = Path(source_name).stem.strip() or "report"
    safe_name = "".join("_" if character in '<>:"/\\|?*' else character for character in stem).strip() or "report"
    target = settings.input_dir / f"{safe_name}{suffix}"
    if not target.exists():
        return target
    for index in range(1, 1000):
        candidate = settings.input_dir / f"{safe_name}_{index}{suffix}"
        if not candidate.exists():
            return candidate
    raise HTTPException(status_code=409, detail="Could not choose an upload filename")


def _form_bool(value: Any) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


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
