from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Biomarker(BaseModel):
    value: float | None = None
    unit: str | None = None
    ref_range: str | None = None
    flag: Literal["HIGH", "LOW", "NORMAL", "PENDING"] | None = None


class ImageFinding(BaseModel):
    title: str
    detail: str | None = None
    severity: Literal["normal", "watch", "concern", "urgent"] | None = None


class Report(BaseModel):
    patient_name: str | None = None
    report_date: str | None = None
    lab_name: str | None = None
    report_status: str | None = None
    modality: str | None = None
    body_region: str | None = None
    summary: str | None = None
    findings: list[ImageFinding] = Field(default_factory=list)
    biomarkers: dict[str, Biomarker] = Field(default_factory=dict)


def validate_report(payload: dict) -> Report:
    return Report(**payload)


def report_to_dict(report: Report) -> dict:
    if hasattr(report, "model_dump"):
        return report.model_dump(exclude_none=True)
    return report.dict(exclude_none=True)
