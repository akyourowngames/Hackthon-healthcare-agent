from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class TextQualityPolicy:
    min_chars: int
    min_digits: int
    min_lines: int
    min_letters: int
    min_letter_ratio: float


@dataclass(frozen=True)
class RuntimePolicy:
    default_dpi: int
    scanned_dpi: int
    latest_output_name: str


@dataclass(frozen=True)
class NimPolicy:
    model: str
    fallback_model: str
    timeout_seconds: float
    text_timeout_seconds: float
    max_tokens: int
    text_max_tokens: int
    temperature: float
    page_sleep_seconds: float
    retry_attempts: int
    retry_backoff_seconds: float


@dataclass(frozen=True)
class PageFilterPolicy:
    min_chars: int
    min_digits: int


@dataclass(frozen=True)
class ExtractionPolicy:
    text_quality: TextQualityPolicy
    runtime: RuntimePolicy
    nim: NimPolicy
    page_filter: PageFilterPolicy


@dataclass(frozen=True)
class TextQuality:
    chars: int
    digits: int
    lines: int
    letters: int
    letter_ratio: float
    usable: bool

    def to_dict(self) -> dict:
        return {
            "chars": self.chars,
            "digits": self.digits,
            "lines": self.lines,
            "letters": self.letters,
            "letter_ratio": self.letter_ratio,
            "usable": self.usable,
        }


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def ensure_dir(path: str | Path) -> Path:
    resolved = Path(path).expanduser().resolve()
    resolved.mkdir(parents=True, exist_ok=True)
    return resolved


def load_environment(root: str | Path | None = None) -> Path | None:
    base = Path(root).expanduser().resolve() if root else project_root()
    env_path = base / ".env"
    if not env_path.exists():
        return None
    try:
        from dotenv import load_dotenv

        load_dotenv(env_path, encoding="utf-8-sig", override=False)
    except ImportError:
        _load_env_file(env_path)
    return env_path


def _load_env_file(path: Path) -> None:
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, found, value = line.partition("=")
        if not found:
            continue
        clean_key = key.strip()
        clean_value = value.strip().strip('"').strip("'")
        if clean_key and clean_key not in os.environ:
            os.environ[clean_key] = clean_value


def read_colon_bullets(path: str | Path, sections: Iterable[str] | None = None) -> list[tuple[str, str, str]]:
    resolved = Path(path).expanduser().resolve()
    allowed = {normalize_label(item) for item in sections} if sections else None
    entries: list[tuple[str, str, str]] = []
    section = ""
    for raw_line in resolved.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.startswith("## "):
            section = normalize_label(line[3:])
            continue
        if allowed is not None and section not in allowed:
            continue
        if not line.startswith("- "):
            continue
        item = line[2:].strip()
        key, found, value = item.partition(":")
        if found:
            entries.append((key.strip(), value.strip(), section))
    return entries


def load_extraction_policy(path: str | Path | None = None) -> ExtractionPolicy:
    policy_path = Path(path).expanduser().resolve() if path else Path(__file__).with_name("extraction_policy.md")
    entries = read_colon_bullets(policy_path, {"Text Quality", "Runtime", "NIM", "Page Filter"})
    values: dict[str, str] = {}
    for key, value, section in entries:
        values[f"{section}.{normalize_label(key)}"] = value
    return ExtractionPolicy(
        text_quality=TextQualityPolicy(
            min_chars=parse_int(values["text_quality.min_chars"]),
            min_digits=parse_int(values["text_quality.min_digits"]),
            min_lines=parse_int(values["text_quality.min_lines"]),
            min_letters=parse_int(values["text_quality.min_letters"]),
            min_letter_ratio=parse_float(values["text_quality.min_letter_ratio"]),
        ),
        runtime=RuntimePolicy(
            default_dpi=parse_int(values["runtime.default_dpi"]),
            scanned_dpi=parse_int(values["runtime.scanned_dpi"]),
            latest_output_name=values["runtime.latest_output_name"].strip(),
        ),
        nim=NimPolicy(
            model=values["nim.model"].strip(),
            fallback_model=values["nim.fallback_model"].strip(),
            timeout_seconds=parse_float(values["nim.timeout_seconds"]),
            text_timeout_seconds=parse_float(values["nim.text_timeout_seconds"]),
            max_tokens=parse_int(values["nim.max_tokens"]),
            text_max_tokens=parse_int(values["nim.text_max_tokens"]),
            temperature=parse_float(values["nim.temperature"]),
            page_sleep_seconds=parse_float(values["nim.page_sleep_seconds"]),
            retry_attempts=parse_int(values["nim.retry_attempts"]),
            retry_backoff_seconds=parse_float(values["nim.retry_backoff_seconds"]),
        ),
        page_filter=PageFilterPolicy(
            min_chars=parse_int(values["page_filter.min_chars"]),
            min_digits=parse_int(values["page_filter.min_digits"]),
        ),
    )


def assess_text_quality(text: str, policy: TextQualityPolicy) -> TextQuality:
    clean = text.strip()
    lines = [line for line in clean.splitlines() if line.strip()]
    digits = sum(1 for character in clean if character.isdigit())
    letters = sum(1 for character in clean if is_ascii_letter(character))
    letter_ratio = (letters / len(clean)) if clean else 0.0
    usable = (
        len(clean) >= policy.min_chars
        and digits >= policy.min_digits
        and len(lines) >= policy.min_lines
        and letters >= policy.min_letters
        and letter_ratio >= policy.min_letter_ratio
    )
    return TextQuality(
        chars=len(clean),
        digits=digits,
        lines=len(lines),
        letters=letters,
        letter_ratio=round(letter_ratio, 4),
        usable=usable,
    )


def is_ascii_letter(character: str) -> bool:
    return ("a" <= character <= "z") or ("A" <= character <= "Z")


def normalize_label(value: str) -> str:
    return "_".join(str(value or "").strip().lower().replace("-", " ").split())


def parse_int(value: object) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    text = str(value or "").strip()
    if not text:
        raise ValueError("Missing integer value")
    return int(text)


def parse_float(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip()
    if not text:
        raise ValueError("Missing float value")
    return float(text)


def safe_stem(path: str | Path) -> str:
    stem = Path(path).stem.strip() or "report"
    invalid = '<>:"/\\|?*'
    cleaned = []
    for character in stem:
        cleaned.append("_" if character in invalid else character)
    return "".join(cleaned).strip() or "report"


def write_json(path: str | Path, payload: object) -> Path:
    resolved = Path(path).expanduser().resolve()
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return resolved


def write_text(path: str | Path, text: str) -> Path:
    resolved = Path(path).expanduser().resolve()
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(text, encoding="utf-8")
    return resolved
