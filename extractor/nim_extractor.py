from __future__ import annotations

import base64
import json
import mimetypes
import multiprocessing
import os
import queue
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .normalizer import merge_reports, normalize_report
from .utils import load_extraction_policy, parse_float, write_text


class NimExtractionError(RuntimeError):
    pass


@dataclass(frozen=True)
class NimSettings:
    api_key: str | None
    base_url: str
    model: str
    fallback_model: str | None
    timeout_seconds: float
    text_timeout_seconds: float
    max_tokens: int
    text_max_tokens: int
    temperature: float
    page_sleep_seconds: float
    retry_attempts: int
    retry_backoff_seconds: float

    @property
    def available(self) -> bool:
        return bool(self.api_key)


def settings_from_env() -> NimSettings:
    policy = load_extraction_policy().nim
    return NimSettings(
        api_key=os.getenv("NVIDIA_API_KEY"),
        base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
        model=os.getenv("NVIDIA_MODEL", policy.model),
        fallback_model=os.getenv("NVIDIA_FALLBACK_MODEL", policy.fallback_model),
        timeout_seconds=parse_float(os.getenv("NVIDIA_TIMEOUT_SECONDS", policy.timeout_seconds)),
        text_timeout_seconds=parse_float(os.getenv("NVIDIA_TEXT_TIMEOUT_SECONDS", policy.text_timeout_seconds)),
        max_tokens=int(os.getenv("NVIDIA_MAX_TOKENS", policy.max_tokens)),
        text_max_tokens=int(os.getenv("NVIDIA_TEXT_MAX_TOKENS", policy.text_max_tokens)),
        temperature=parse_float(os.getenv("NVIDIA_TEMPERATURE", policy.temperature)),
        page_sleep_seconds=parse_float(os.getenv("NIM_PAGE_SLEEP_SECONDS", policy.page_sleep_seconds)),
        retry_attempts=int(os.getenv("NIM_RETRY_ATTEMPTS", policy.retry_attempts)),
        retry_backoff_seconds=parse_float(os.getenv("NIM_RETRY_BACKOFF_SECONDS", policy.retry_backoff_seconds)),
    )


def extract_report_from_images(
    image_paths: list[str | Path],
    output_dir: str | Path,
    settings: NimSettings | None = None,
    prompt_path: str | Path | None = None,
) -> dict:
    config = settings or settings_from_env()
    if not config.available:
        raise NimExtractionError("NVIDIA_API_KEY is missing")
    prompt = read_prompt(prompt_path)
    page_reports: list[dict] = []
    errors: list[str] = []
    for page_number, image_path in enumerate(image_paths, start=1):
        try:
            page_report = extract_page(image_path, page_number, output_dir, config, prompt)
            page_reports.append(page_report)
        except NimExtractionError as exc:
            errors.append(f"page {page_number}: {exc}")
            debug_path = Path(output_dir).expanduser().resolve() / f"debug_nim_page_{page_number:03d}_error.txt"
            write_text(debug_path, str(exc))
        if config.page_sleep_seconds > 0 and page_number < len(image_paths):
            time.sleep(config.page_sleep_seconds)
    if not page_reports:
        raise NimExtractionError("; ".join(errors) or "No NIM page responses succeeded")
    merged: dict[str, Any] = {
        "patient_name": None,
        "report_date": None,
        "lab_name": None,
        "report_status": None,
        "biomarkers": {},
    }
    for page_report in page_reports:
        merged = merge_reports(merged, page_report)
    return normalize_report(merged)


def extract_report_from_text(
    text: str,
    output_dir: str | Path,
    settings: NimSettings | None = None,
    prompt_path: str | Path | None = None,
) -> dict:
    config = settings or settings_from_env()
    if not config.available:
        raise NimExtractionError("NVIDIA_API_KEY is missing")
    prompt = read_prompt(prompt_path)
    raw = call_nim_text_with_timeout(text, config, prompt)
    debug_path = Path(output_dir).expanduser().resolve() / "debug_nim_text_response.txt"
    write_text(debug_path, raw)
    try:
        parsed = extract_json_object(raw)
    except ValueError as exc:
        raise NimExtractionError(f"NIM text response did not contain valid JSON: {exc}") from exc
    return normalize_report(parsed)


def extract_report_from_image_file(
    image_path: str | Path,
    output_dir: str | Path,
    settings: NimSettings | None = None,
    prompt_path: str | Path | None = None,
) -> dict:
    config = settings or settings_from_env()
    if not config.available:
        raise NimExtractionError("NVIDIA_API_KEY is missing")
    image_prompt_path = (
        Path(prompt_path).expanduser().resolve() if prompt_path else Path(__file__).with_name("image_report_prompt.md")
    )
    prompt = image_prompt_path.read_text(encoding="utf-8").strip()
    target_dir = Path(output_dir).expanduser().resolve()
    target_dir.mkdir(parents=True, exist_ok=True)
    models = [config.model]
    if config.fallback_model and config.fallback_model not in models:
        models.append(config.fallback_model)
    errors: list[str] = []
    retry_attempts = max(1, config.retry_attempts)
    for model_index, model in enumerate(models, start=1):
        for attempt in range(1, retry_attempts + 1):
            try:
                raw = call_nim_with_timeout(image_path, config, prompt, model)
            except Exception as exc:
                errors.append(f"{model}: attempt {attempt}: provider error: {exc}")
                sleep_before_retry(config, attempt, retry_attempts)
                continue
            debug_path = (
                target_dir / f"debug_nim_image_model_{model_index}_attempt_{attempt}.txt"
            )
            write_text(debug_path, raw)
            try:
                parsed = extract_json_object(raw)
                return normalize_report(parsed)
            except ValueError as exc:
                errors.append(f"{model}: attempt {attempt}: {exc}")
                sleep_before_retry(config, attempt, retry_attempts)
    raise NimExtractionError(f"NIM image response did not contain valid JSON: {'; '.join(errors)}")


def extract_page(
    image_path: str | Path,
    page_number: int,
    output_dir: str | Path,
    settings: NimSettings,
    prompt: str,
) -> dict:
    models = [settings.model]
    if settings.fallback_model and settings.fallback_model not in models:
        models.append(settings.fallback_model)
    errors: list[str] = []
    retry_attempts = max(1, settings.retry_attempts)
    for model_index, model in enumerate(models, start=1):
        for attempt in range(1, retry_attempts + 1):
            try:
                raw = call_nim_with_timeout(image_path, settings, prompt, model)
            except Exception as exc:
                errors.append(f"{model}: attempt {attempt}: provider error: {exc}")
                sleep_before_retry(settings, attempt, retry_attempts)
                continue
            debug_path = (
                Path(output_dir).expanduser().resolve()
                / f"debug_nim_page_{page_number:03d}_model_{model_index}_attempt_{attempt}.txt"
            )
            write_text(debug_path, raw)
            try:
                parsed = extract_json_object(raw)
                return normalize_report(parsed)
            except ValueError as exc:
                errors.append(f"{model}: attempt {attempt}: {exc}")
                sleep_before_retry(settings, attempt, retry_attempts)
    raise NimExtractionError(f"NIM response did not contain valid JSON for page {page_number}: {'; '.join(errors)}")


def sleep_before_retry(settings: NimSettings, attempt: int, retry_attempts: int) -> None:
    if attempt >= retry_attempts or settings.retry_backoff_seconds <= 0:
        return
    time.sleep(settings.retry_backoff_seconds * attempt)


def call_nim_with_timeout(image_path: str | Path, settings: NimSettings, prompt: str, model: str) -> str:
    if settings.timeout_seconds <= 0:
        return call_nim(image_path, settings, prompt, model)
    context = multiprocessing.get_context("spawn")
    result_queue = context.Queue()
    process = context.Process(
        target=call_nim_worker,
        args=(str(Path(image_path).expanduser().resolve()), settings, prompt, model, result_queue),
    )
    process.start()
    process.join(settings.timeout_seconds)
    if process.is_alive():
        process.terminate()
        process.join(3)
        raise TimeoutError(f"NIM call exceeded {settings.timeout_seconds} seconds")
    try:
        status, payload = result_queue.get_nowait()
    except queue.Empty as exc:
        raise NimExtractionError(f"NIM worker exited without a response: exit_code={process.exitcode}") from exc
    if status == "ok":
        return str(payload)
    raise NimExtractionError(str(payload))


def call_nim_text_with_timeout(text: str, settings: NimSettings, prompt: str) -> str:
    if settings.text_timeout_seconds <= 0:
        return call_nim_text(text, settings, prompt)
    context = multiprocessing.get_context("spawn")
    result_queue = context.Queue()
    process = context.Process(
        target=call_nim_text_worker,
        args=(text, settings, prompt, result_queue),
    )
    process.start()
    process.join(settings.text_timeout_seconds)
    if process.is_alive():
        process.terminate()
        process.join(3)
        raise TimeoutError(f"NIM text call exceeded {settings.text_timeout_seconds} seconds")
    try:
        status, payload = result_queue.get_nowait()
    except queue.Empty as exc:
        raise NimExtractionError(f"NIM text worker exited without a response: exit_code={process.exitcode}") from exc
    if status == "ok":
        return str(payload)
    raise NimExtractionError(str(payload))


def call_nim_worker(
    image_path: str,
    settings: NimSettings,
    prompt: str,
    model: str,
    result_queue: multiprocessing.Queue,
) -> None:
    try:
        result_queue.put(("ok", call_nim(image_path, settings, prompt, model)))
    except Exception as exc:
        result_queue.put(("error", str(exc)))


def call_nim_text_worker(
    text: str,
    settings: NimSettings,
    prompt: str,
    result_queue: multiprocessing.Queue,
) -> None:
    try:
        result_queue.put(("ok", call_nim_text(text, settings, prompt)))
    except Exception as exc:
        result_queue.put(("error", str(exc)))


def call_nim(image_path: str | Path, settings: NimSettings, prompt: str, model: str) -> str:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise NimExtractionError("openai package is missing") from exc

    client = OpenAI(
        api_key=settings.api_key,
        base_url=settings.base_url,
        timeout=settings.timeout_seconds,
    )
    response = client.chat.completions.create(
        model=model,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url(image_path)}},
                ],
            }
        ],
    )
    message = response.choices[0].message
    return str(message.content or "")


def call_nim_text(text: str, settings: NimSettings, prompt: str) -> str:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise NimExtractionError("openai package is missing") from exc

    client = OpenAI(
        api_key=settings.api_key,
        base_url=settings.base_url,
        timeout=settings.text_timeout_seconds,
    )
    response = client.chat.completions.create(
        model=settings.model,
        temperature=settings.temperature,
        max_tokens=settings.text_max_tokens,
        messages=[
            {
                "role": "user",
                "content": f"{prompt}\n\nReport OCR/text content:\n{text}",
            }
        ],
    )
    message = response.choices[0].message
    return str(message.content or "")


def image_data_url(image_path: str | Path) -> str:
    path = Path(image_path).expanduser().resolve()
    mime_type = mimetypes.guess_type(str(path))[0] or _image_mime_fallback(path.suffix)
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _image_mime_fallback(suffix: str) -> str:
    extension = str(suffix or "").lower().lstrip(".")
    if not extension:
        return "image/png"
    if extension in {"jpg", "jpe"}:
        extension = "jpeg"
    if extension in {"tif"}:
        extension = "tiff"
    if extension in {"jpeg", "png", "webp", "bmp", "tiff", "gif", "heic", "heif"}:
        return f"image/{extension}"
    return "image/png"


def extract_json_object(raw_text: str) -> dict:
    text = strip_code_fences(raw_text)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end < start:
            raise ValueError("No JSON object found")
        try:
            parsed = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise ValueError(str(exc)) from exc
    if not isinstance(parsed, dict):
        raise ValueError("Top-level JSON is not an object")
    return parsed


def strip_code_fences(raw_text: str) -> str:
    lines = []
    for raw_line in str(raw_text or "").strip().splitlines():
        line = raw_line.strip()
        if line.startswith("```"):
            continue
        lines.append(raw_line)
    return "\n".join(lines).strip()


def read_prompt(path: str | Path | None = None) -> str:
    prompt_path = Path(path).expanduser().resolve() if path else Path(__file__).with_name("nim_prompt.md")
    return prompt_path.read_text(encoding="utf-8").strip()
