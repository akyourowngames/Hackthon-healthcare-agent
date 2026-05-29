from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from extractor.main import run_image_pipeline, run_pipeline
from extractor.utils import safe_stem, write_json

from .config import AgentSettings, load_agent_settings
from .store import (
    copy_source_to_storage,
    find_report_id_by_source,
    save_document,
    save_report,
    source_exists,
)


@dataclass
class InputProcessSummary:
    input_dir: Path
    output_dir: Path
    processed: list[dict[str, Any]] = field(default_factory=list)
    skipped: list[dict[str, Any]] = field(default_factory=list)
    failed: list[dict[str, Any]] = field(default_factory=list)

    @property
    def touched(self) -> int:
        return len(self.processed) + len(self.failed) + len(self.skipped)


def ensure_agent_folders(settings: AgentSettings | None = None) -> AgentSettings:
    active_settings = settings or load_agent_settings()
    active_settings.input_dir.mkdir(parents=True, exist_ok=True)
    active_settings.default_output_dir.mkdir(parents=True, exist_ok=True)
    active_settings.reports_dir.mkdir(parents=True, exist_ok=True)
    active_settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    return active_settings


def process_input_folder(
    settings: AgentSettings | None = None,
    local_only: bool = False,
    user_id: str | None = None,
) -> InputProcessSummary:
    active_settings = ensure_agent_folders(settings)
    summary = InputProcessSummary(
        input_dir=active_settings.input_dir,
        output_dir=active_settings.default_output_dir,
    )
    for path in sorted(active_settings.input_dir.iterdir(), key=lambda item: item.name.casefold()):
        if not path.is_file():
            continue
        if path.name.startswith("."):
            continue
        extension = path.suffix.lower()
        if extension not in active_settings.supported_extensions:
            summary.skipped.append({"path": str(path), "reason": "unsupported_extension"})
            continue
        if source_exists(path, active_settings, user_id=user_id):
            summary.skipped.append({"path": str(path), "reason": "already_stored"})
            continue
        try:
            summary.processed.append(_process_file(path, active_settings, local_only, user_id))
        except Exception as exc:
            summary.failed.append({"path": str(path), "error": str(exc)})
    return summary


def process_single_file(
    path: str | Path,
    settings: AgentSettings | None = None,
    local_only: bool = False,
    user_id: str | None = None,
) -> dict[str, Any]:
    active_settings = ensure_agent_folders(settings)
    resolved = Path(path).expanduser().resolve()
    if not resolved.exists() or not resolved.is_file():
        raise FileNotFoundError(f"File not found: {resolved}")
    if resolved.suffix.lower() not in active_settings.supported_extensions:
        raise ValueError(f"Unsupported file type: {resolved.suffix}")
    existing_report_id = find_report_id_by_source(resolved, active_settings, user_id=user_id)
    if existing_report_id is not None:
        return {"path": str(resolved), "kind": "existing", "report_id": existing_report_id, "reason": "already_stored"}
    return _process_file(resolved, active_settings, local_only, user_id)


def _process_file(path: Path, settings: AgentSettings, local_only: bool, user_id: str | None = None) -> dict[str, Any]:
    extension = path.suffix.lower()
    output_dir = settings.default_output_dir / safe_stem(path)
    if extension == ".pdf":
        result = run_pipeline(path, output_dir=output_dir, local_only=local_only)
        payload = json.loads(Path(result["output_path"]).read_text(encoding="utf-8"))
        copy_source_to_storage(path, settings)
        report_id = save_report(payload, path, result["output_path"], settings, user_id=user_id)
        return {
            "path": str(path),
            "kind": "pdf",
            "report_id": report_id,
            "output_path": result["output_path"],
            "source": result.get("source", ""),
            "biomarkers": result.get("biomarker_count", 0),
            "findings": result.get("finding_count", 0),
            "patient_name": str(payload.get("patient_name") or ""),
            "report_date": str(payload.get("report_date") or ""),
            "lab_name": str(payload.get("lab_name") or ""),
            "summary": str(payload.get("summary") or ""),
            "modality": str(payload.get("modality") or ""),
        }
    if extension in settings.image_extensions:
        result = run_image_pipeline(path, output_dir=output_dir, local_only=local_only)
        payload = json.loads(Path(result["output_path"]).read_text(encoding="utf-8"))
        if not payload.get("patient_name"):
            payload["patient_name"] = path.stem
        if not payload.get("report_date"):
            payload["report_date"] = datetime.now().date().isoformat()
        if not payload.get("report_status"):
            payload["report_status"] = "image"
        Path(result["output_path"]).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        copy_source_to_storage(path, settings)
        report_id = save_report(payload, path, result["output_path"], settings, user_id=user_id)
        return {
            "path": str(path),
            "kind": "image",
            "report_id": report_id,
            "output_path": result["output_path"],
            "source": result.get("source", "image"),
            "biomarkers": result.get("biomarker_count", 0),
            "findings": result.get("finding_count", 0),
            "patient_name": str(payload.get("patient_name") or ""),
            "report_date": str(payload.get("report_date") or ""),
            "lab_name": str(payload.get("lab_name") or ""),
            "summary": str(payload.get("summary") or ""),
            "modality": str(payload.get("modality") or ""),
        }
    if extension == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        output_path = output_dir / f"{safe_stem(path)}.json"
        write_json(output_path, payload)
        report_id = save_report(payload, path, output_path, settings, user_id=user_id)
        return {
            "path": str(path),
            "kind": "json",
            "report_id": report_id,
            "output_path": str(output_path),
            "biomarkers": len(payload.get("biomarkers") or {}) if isinstance(payload.get("biomarkers"), dict) else 0,
            "findings": len(payload.get("findings") or []) if isinstance(payload.get("findings"), list) else 0,
            "patient_name": str(payload.get("patient_name") or ""),
            "report_date": str(payload.get("report_date") or ""),
            "lab_name": str(payload.get("lab_name") or ""),
            "summary": str(payload.get("summary") or ""),
            "modality": str(payload.get("modality") or ""),
        }
    copy_source_to_storage(path, settings)
    output_path = output_dir / f"{safe_stem(path)}.json"
    report_id = save_document(path, output_path, settings, user_id=user_id)
    return {
        "path": str(path),
        "kind": extension.lstrip(".") or "text",
        "report_id": report_id,
        "output_path": str(output_path),
    }
