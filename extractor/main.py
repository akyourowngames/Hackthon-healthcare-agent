from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from .docling_parser import TextExtractionResult, extract_text as extract_docling_text
from .nim_extractor import (
    NimExtractionError,
    extract_report_from_images,
    extract_report_from_text,
    settings_from_env,
)
from .normalizer import merge_reports, normalize_report
from .ocr_parser import extract_text_from_images
from .parser_rules import parse_text_report
from .pdf_to_images import extract_page_text_layers, extract_text_layer, pdf_to_images
from .schema import report_to_dict, validate_report
from .utils import (
    assess_text_quality,
    ensure_dir,
    load_environment,
    load_extraction_policy,
    project_root,
    safe_stem,
    write_json,
    write_text,
)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        result = run_pipeline(
            pdf_path=args.pdf_path,
            output_dir=args.output_dir,
            dpi=args.dpi,
            local_only=args.local_only,
        )
        stored_report_id = None if args.no_agent_store else store_agent_report(result, args.pdf_path)
    except Exception as exc:
        print(f"Failure: {exc}")
        return 1
    print(f"Success: saved {result['output_path']}")
    print(f"Source: {result['source']}")
    print(f"Biomarkers: {result['biomarker_count']}")
    if stored_report_id is not None:
        print(f"Stored report id: {stored_report_id}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Extract structured biomarkers from a lab report PDF.")
    parser.add_argument("pdf_path", help="Path to the lab report PDF.")
    parser.add_argument("--output-dir", default=None, help="Directory for JSON, images, and debug files.")
    parser.add_argument("--dpi", type=int, default=None, help="PDF render DPI for NIM image extraction.")
    parser.add_argument("--local-only", action="store_true", help="Skip NIM and use local text/OCR fallbacks.")
    parser.add_argument("--no-agent-store", action="store_true", help="Do not store the extracted report in Vaidy's agent memory.")
    return parser


def store_agent_report(result: dict[str, Any], pdf_path: str | Path) -> int | None:
    from healthcare_agent.config import load_agent_settings
    from healthcare_agent.store import copy_source_to_storage, save_report, source_exists

    settings = load_agent_settings()
    source_pdf = Path(pdf_path).expanduser().resolve()
    if source_exists(source_pdf, settings):
        return None
    output_path = Path(str(result.get("output_path") or "")).expanduser().resolve()
    payload = json.loads(output_path.read_text(encoding="utf-8"))
    copy_source_to_storage(source_pdf, settings)
    return save_report(payload, source_pdf, output_path, settings)


def run_pipeline(
    pdf_path: str | Path,
    output_dir: str | Path | None = None,
    dpi: int | None = None,
    local_only: bool = False,
) -> dict[str, Any]:
    root = project_root()
    load_environment(root)
    policy = load_extraction_policy()
    source_pdf = Path(pdf_path).expanduser().resolve()
    if not source_pdf.exists() or source_pdf.suffix.lower() != ".pdf":
        raise FileNotFoundError(f"PDF not found: {source_pdf}")

    target_dir = ensure_dir(output_dir or root / "outputs")
    render_dpi = dpi or policy.runtime.default_dpi
    page_texts = extract_page_text_layers(source_pdf)
    fast_text = "\n".join(page_texts) if page_texts else extract_text_layer(source_pdf)
    text_result = TextExtractionResult(
        fast_text,
        "pymupdf",
        "ok" if fast_text.strip() else "empty",
    )
    write_text(target_dir / "debug_text.txt", text_result.text)
    quality = assess_text_quality(text_result.text, policy.text_quality)
    write_json(
        target_dir / "debug_quality.json",
        {
            "text": quality.to_dict(),
            "extractor": text_result.to_dict(),
        },
    )

    image_paths = pdf_to_images(source_pdf, target_dir, dpi=render_dpi)
    nim_image_paths = select_nim_image_paths(image_paths, page_texts, policy.page_filter, target_dir)
    report_payload: dict[str, Any] | None = None
    source = ""
    errors: list[str] = []

    settings = settings_from_env()
    if not local_only and settings.available:
        if nim_image_paths:
            try:
                report_payload = extract_report_from_images(nim_image_paths, target_dir, settings=settings)
                source = "nim"
            except NimExtractionError as exc:
                errors.append(str(exc))
        else:
            errors.append("No NIM pages selected by local page filter")
    elif not local_only:
        errors.append("NVIDIA_API_KEY is missing")

    if report_payload is None:
        report_payload, source = local_fallback_report(
            text_result.text,
            quality.usable,
            image_paths,
            target_dir,
            settings,
            local_only,
            errors,
        )
        if not report_payload.get("biomarkers"):
            text_result = best_local_text(source_pdf, policy.text_quality, text_result)
            write_text(target_dir / "debug_text.txt", text_result.text)
            quality = assess_text_quality(text_result.text, policy.text_quality)
            write_json(
                target_dir / "debug_quality.json",
                {
                    "text": quality.to_dict(),
                    "extractor": text_result.to_dict(),
                },
            )
            if text_result.text.strip():
                report_payload, source = text_report_with_nim_fallback(
                    text_result.text,
                    target_dir,
                    settings,
                    local_only,
                    errors,
                    text_result.extractor,
                )
    elif quality.usable:
        local_payload = parse_text_report(text_result.text)
        report_payload = merge_reports(report_payload, local_payload)
    elif not local_only and errors:
        text_payload, text_source = local_fallback_report(
            text_result.text,
            False,
            image_paths,
            target_dir,
            settings,
            local_only,
            errors,
        )
        if text_payload.get("biomarkers"):
            if text_source == "nim_text":
                report_payload = merge_text_preferred(report_payload, text_payload)
            else:
                report_payload = merge_reports(report_payload, text_payload)
            source = f"{source}+{text_source}"

    normalized = normalize_report(report_payload)
    if not normalized.get("biomarkers"):
        details = "; ".join(errors) if errors else "no biomarkers found"
        raise RuntimeError(f"No biomarkers extracted ({details})")

    try:
        report = validate_report(normalized)
    except ValidationError as exc:
        write_text(target_dir / "debug_validation_error.txt", str(exc))
        raise RuntimeError(f"Validation failed; see {target_dir / 'debug_validation_error.txt'}") from exc

    output_payload = report_to_dict(report)
    output_path = target_dir / f"{safe_stem(source_pdf)}.json"
    latest_path = target_dir / policy.runtime.latest_output_name
    write_json(output_path, output_payload)
    write_json(latest_path, output_payload)
    return {
        "output_path": str(output_path),
        "latest_path": str(latest_path),
        "source": source,
        "biomarker_count": len(output_payload.get("biomarkers", {})),
    }


def best_local_text(
    pdf_path: Path,
    quality_policy,
    initial: TextExtractionResult | None = None,
) -> TextExtractionResult:
    candidates = []
    if initial is not None:
        candidates.append(initial)
        if assess_text_quality(initial.text, quality_policy).usable:
            return initial
    docling = extract_docling_text(pdf_path)
    candidates.append(docling)
    if not candidates:
        return docling
    return max(candidates, key=lambda candidate: text_candidate_score(candidate.text, quality_policy))


def text_candidate_score(text: str, quality_policy) -> tuple[bool, int, int, int]:
    quality = assess_text_quality(text, quality_policy)
    return (quality.usable, quality.lines, quality.digits, quality.chars)


def select_nim_image_paths(
    image_paths: list[Path],
    page_texts: list[str],
    page_filter,
    output_dir: Path,
) -> list[Path]:
    selected: list[Path] = []
    decisions: list[dict[str, Any]] = []
    has_text_layer = False
    for index, image_path in enumerate(image_paths):
        page_number = index + 1
        page_text = page_texts[index] if index < len(page_texts) else ""
        if page_text.strip():
            has_text_layer = True
        decision = nim_page_decision(page_text, page_filter)
        decision["page"] = page_number
        decision["image_path"] = str(image_path)
        decisions.append(decision)
        if decision["selected"]:
            selected.append(image_path)
    mode = "filtered_by_local_text"
    if not selected and not has_text_layer:
        selected = list(image_paths)
        mode = "all_pages_no_text_layer"
    elif not selected and has_text_layer:
        selected = list(image_paths)
        mode = "all_pages_no_structural_match"
    write_json(
        output_dir / "debug_nim_pages.json",
        {
            "mode": mode,
            "selected_count": len(selected),
            "total_pages": len(image_paths),
            "pages": decisions,
        },
    )
    return selected


def nim_page_decision(text: str, page_filter) -> dict[str, Any]:
    clean = text.strip()
    digit_count = sum(1 for character in clean if character.isdigit())
    selected = (
        len(clean) >= page_filter.min_chars
        and digit_count >= page_filter.min_digits
    )
    if selected:
        reason = "text_and_number_evidence"
    elif len(clean) < page_filter.min_chars:
        reason = "too_little_text"
    elif digit_count < page_filter.min_digits:
        reason = "no_numeric_evidence"
    else:
        reason = "text_evidence"
    return {
        "selected": selected,
        "reason": reason,
        "chars": len(clean),
        "digits": digit_count,
    }


def local_fallback_report(
    text: str,
    text_is_usable: bool,
    image_paths: list[Path],
    output_dir: Path,
    settings,
    local_only: bool,
    errors: list[str],
) -> tuple[dict[str, Any], str]:
    if text_is_usable:
        report, source = text_report_with_nim_fallback(
            text,
            output_dir,
            settings,
            local_only,
            errors,
            "local_text",
        )
        if report.get("biomarkers"):
            return report, source
    ocr_result = extract_text_from_images(image_paths)
    write_text(output_dir / "debug_ocr_text.txt", ocr_result.text)
    write_json(output_dir / "debug_ocr_status.json", ocr_result.to_dict())
    if ocr_result.text.strip():
        return text_report_with_nim_fallback(
            ocr_result.text,
            output_dir,
            settings,
            local_only,
            errors,
            "paddleocr",
        )
    return {"patient_name": None, "report_date": None, "lab_name": None, "biomarkers": {}}, ocr_result.status


def text_report_with_nim_fallback(
    text: str,
    output_dir: Path,
    settings,
    local_only: bool,
    errors: list[str],
    fallback_source: str,
) -> tuple[dict[str, Any], str]:
    rule_report = parse_text_report(text)
    if not local_only and settings.available:
        try:
            nim_report = extract_report_from_text(text, output_dir, settings=settings)
            return merge_text_preferred(rule_report, nim_report), "nim_text"
        except Exception as exc:
            errors.append(f"NIM text fallback failed: {exc}")
    return rule_report, fallback_source


def merge_text_preferred(image_payload: dict[str, Any], text_payload: dict[str, Any]) -> dict[str, Any]:
    result = merge_reports(text_payload, image_payload)
    text_report = normalize_report(text_payload)
    image_report = normalize_report(image_payload)
    for name, text_biomarker in text_report.get("biomarkers", {}).items():
        if name not in image_report.get("biomarkers", {}):
            continue
        merged = dict(result.get("biomarkers", {}).get(name, {}))
        for field in ("value", "flag"):
            if field in text_biomarker:
                merged[field] = text_biomarker.get(field)
            elif field in merged and text_biomarker.get(field) is None:
                merged.pop(field, None)
        result["biomarkers"][name] = merged
    return result


def run_image_pipeline(
    image_path: str | Path,
    output_dir: str | Path | None = None,
    local_only: bool = False,
) -> dict[str, Any]:
    root = project_root()
    load_environment(root)
    source = Path(image_path).expanduser().resolve()
    if not source.exists() or not source.is_file():
        raise FileNotFoundError(f"Image not found: {source}")
    target_dir = ensure_dir(output_dir or root / "outputs" / safe_stem(source))
    settings = settings_from_env()
    errors: list[str] = []
    payload: dict[str, Any] | None = None
    low_information_image = _is_low_information_image(source)
    if low_information_image:
        errors.append("image file is too small to support reliable visual analysis")
    if not local_only and settings.available:
        try:
            if low_information_image:
                raise NimExtractionError("image skipped before vision analysis because it is too small")
            from .nim_extractor import extract_report_from_image_file

            payload = extract_report_from_image_file(source, target_dir, settings=settings)
        except NimExtractionError as exc:
            errors.append(str(exc))
    elif not local_only:
        errors.append("NVIDIA_API_KEY is missing")
    if payload is None:
        ocr_result = extract_text_from_images([source])
        write_text(target_dir / "debug_ocr_text.txt", ocr_result.text)
        write_json(target_dir / "debug_ocr_status.json", ocr_result.to_dict())
        if ocr_result.text.strip():
            payload, _ = text_report_with_nim_fallback(
                ocr_result.text,
                target_dir,
                settings,
                local_only,
                errors,
                "paddleocr",
            )
        else:
            payload = {
                "patient_name": None,
                "report_date": None,
                "lab_name": None,
                "summary": "Image was uploaded but no readable text or findings could be extracted.",
                "modality": None,
                "body_region": None,
                "findings": [
                    {
                        "title": "image not analyzed",
                        "detail": "; ".join(errors) or "no extractor was available for this image.",
                        "severity": "watch",
                    }
                ],
                "biomarkers": {},
            }
    normalized = normalize_report(payload)
    if not normalized.get("findings") and not normalized.get("biomarkers") and not normalized.get("summary"):
        normalized["findings"] = [
            {
                "title": "image stored",
                "detail": "Vaidy stored the image but did not extract structured findings.",
                "severity": "watch",
            }
        ]
    try:
        report = validate_report(normalized)
    except ValidationError as exc:
        write_text(target_dir / "debug_validation_error.txt", str(exc))
        raise RuntimeError(f"Validation failed; see {target_dir / 'debug_validation_error.txt'}") from exc
    output_payload = report_to_dict(report)
    output_path = target_dir / f"{safe_stem(source)}.json"
    latest_path = target_dir / "report.json"
    write_json(output_path, output_payload)
    write_json(latest_path, output_payload)
    return {
        "output_path": str(output_path),
        "latest_path": str(latest_path),
        "source": "nim_image" if not errors and payload is not None else "image_fallback",
        "biomarker_count": len(output_payload.get("biomarkers", {})),
        "finding_count": len(output_payload.get("findings", [])),
    }


def _is_low_information_image(path: Path) -> bool:
    try:
        size = path.stat().st_size
    except OSError:
        return False
    return size < 512


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
