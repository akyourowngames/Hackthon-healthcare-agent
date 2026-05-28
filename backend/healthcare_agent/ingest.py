from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from extractor.main import run_pipeline
from extractor.utils import safe_stem, write_json

from .config import AgentSettings, load_agent_settings
from .store import (
    copy_source_to_storage,
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
        if source_exists(path, active_settings):
            summary.skipped.append({"path": str(path), "reason": "already_stored"})
            continue
        try:
            summary.processed.append(_process_file(path, active_settings, local_only))
        except Exception as exc:
            summary.failed.append({"path": str(path), "error": str(exc)})
    return summary


def _process_file(path: Path, settings: AgentSettings, local_only: bool) -> dict[str, Any]:
    extension = path.suffix.lower()
    if extension == ".pdf":
        output_dir = settings.default_output_dir / safe_stem(path)
        result = run_pipeline(path, output_dir=output_dir, local_only=local_only)
        payload = json.loads(Path(result["output_path"]).read_text(encoding="utf-8"))
        copy_source_to_storage(path, settings)
        report_id = save_report(payload, path, result["output_path"], settings)
        return {
            "path": str(path),
            "kind": "pdf",
            "report_id": report_id,
            "output_path": result["output_path"],
            "source": result.get("source", ""),
            "biomarkers": result.get("biomarker_count", 0),
        }
    if extension == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        output_dir = settings.default_output_dir / safe_stem(path)
        output_path = output_dir / f"{safe_stem(path)}.json"
        write_json(output_path, payload)
        report_id = save_report(payload, path, output_path, settings)
        return {
            "path": str(path),
            "kind": "json",
            "report_id": report_id,
            "output_path": str(output_path),
        }
    copy_source_to_storage(path, settings)
    output_dir = settings.default_output_dir / safe_stem(path)
    output_path = output_dir / f"{safe_stem(path)}.json"
    report_id = save_document(path, output_path, settings)
    return {
        "path": str(path),
        "kind": extension.lstrip(".") or "text",
        "report_id": report_id,
        "output_path": str(output_path),
    }
