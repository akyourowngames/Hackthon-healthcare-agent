from __future__ import annotations

from pathlib import Path
from typing import Any

from extractor.utils import normalize_label, read_colon_bullets

from .config import AgentSettings
from .language import detect_language
from .store import dashboard_snapshot, list_reports


def fast_agent_answer(message: str, settings: AgentSettings, language_preference: str = "auto") -> str:
    command = resolve_fast_command(message)
    if not command:
        return ""
    language = detect_language(message, language_preference)
    if command == "quick_reply":
        return _quick_reply(language)
    if command == "report_inventory":
        return _report_inventory(settings, language)
    if command == "latest_patient":
        return _latest_patient(settings, language)
    if command == "latest_report_name":
        return _latest_report_name(settings, language)
    if command == "extraction_help":
        return _extraction_help(language)
    return ""


def resolve_fast_command(message: str) -> str:
    text = " ".join(str(message or "").casefold().strip().split())
    if not text:
        return ""
    commands = _load_commands()
    normalized = normalize_label(text)
    for command, phrases in commands.items():
        if normalized == command or text in phrases:
            return command
    return ""


def _load_commands() -> dict[str, list[str]]:
    path = Path(__file__).with_name("agent_commands.md")
    entries = read_colon_bullets(path, {"Commands"})
    commands: dict[str, list[str]] = {}
    for key, value, _section in entries:
        phrases = [" ".join(item.casefold().split()) for item in value.split("|") if item.strip()]
        commands[normalize_label(key)] = phrases
    return commands


def _report_inventory(settings: AgentSettings, language: str) -> str:
    reports = list_reports(settings)
    if not reports:
        return _line(language, "I do not have any stored reports yet.", "Abhi koi stored report nahi hai.")
    lines = [
        _line(
            language,
            f"I have {len(reports)} stored report(s) in the shared Vaidy agent database:",
            f"Shared Vaidy agent database me {len(reports)} stored report(s) hain:",
        )
    ]
    for report in reports[:12]:
        lines.append("- " + _report_label(report))
    return "\n".join(lines)


def _latest_patient(settings: AgentSettings, language: str) -> str:
    report = _latest_report(settings)
    if report is None:
        return _line(language, "I do not have a stored report to read from yet.", "Abhi read karne ke liye stored report nahi hai.")
    patient = str(report.get("patient_name") or "").strip()
    if not patient:
        return _line(
            language,
            f"The latest stored report does not include a patient name. Report: {_report_label(report)}",
            f"Latest stored report me patient name nahi mila. Report: {_report_label(report)}",
        )
    return _line(language, f"The latest stored report patient name is {patient}.", f"Latest stored report ka patient name {patient} hai.")


def _latest_report_name(settings: AgentSettings, language: str) -> str:
    report = _latest_report(settings)
    if report is None:
        return _line(language, "I do not have a stored report yet.", "Abhi koi stored report nahi hai.")
    source = Path(str(report.get("source_path") or "")).name
    stored = Path(str(report.get("stored_json_path") or "")).name
    name = source or stored or f"report {report.get('id')}"
    return _line(language, f"The latest stored report is {name}. {_report_label(report)}", f"Latest stored report {name} hai. {_report_label(report)}")


def _extraction_help(language: str) -> str:
    english = (
        "To extract and store a PDF in the same Vaidy agent memory, run "
        "`python -m extractor.main \"C:\\path\\report.pdf\"` from the project root, "
        "or click the upload button in the web chat/dashboard. The standalone extractor now stores successful results in the agent database."
    )
    hindi = (
        "PDF ko same Vaidy agent memory me extract aur store karne ke liye project root se "
        "`python -m extractor.main \"C:\\path\\report.pdf\"` run karo, ya web chat/dashboard ka upload button use karo. "
        "Standalone extractor ab successful result ko agent database me store karta hai."
    )
    return _line(language, english, hindi)


def _quick_reply(language: str) -> str:
    return _line(
        language,
        "Hi. I am ready, and I can use the same stored reports from CLI and web.",
        "Hi. Main ready hoon, aur CLI aur web dono me same stored reports use kar sakta hoon.",
    )


def _latest_report(settings: AgentSettings) -> dict[str, Any] | None:
    reports = list_reports(settings)
    return reports[0] if reports else None


def _report_label(report: dict[str, Any]) -> str:
    patient = str(report.get("patient_name") or "unknown patient")
    date = str(report.get("report_date") or "unknown date")
    lab = str(report.get("lab_name") or "unknown lab")
    count = str(report.get("biomarker_count") or 0)
    source = Path(str(report.get("source_path") or "")).name
    source_text = f" | source={source}" if source else ""
    return f"report {report.get('id')}: {patient} | {date} | {lab} | biomarkers={count}{source_text}"


def _line(language: str, english: str, hindi: str) -> str:
    return hindi if language == "hi" else english
