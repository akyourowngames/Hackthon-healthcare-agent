from __future__ import annotations

from pathlib import Path
from typing import Any

from .normalizer import (
    clean_optional_text,
    load_aliases,
    normalize_flag,
    normalize_report,
    normalize_text_key,
    to_float,
)
from .utils import read_colon_bullets


def parse_text_report(
    text: str,
    alias_path: str | Path | None = None,
    metadata_path: str | Path | None = None,
) -> dict:
    aliases = load_aliases(alias_path)
    metadata = parse_metadata(text, metadata_path)
    report: dict[str, Any] = {
        "patient_name": metadata.get("patient_name"),
        "report_date": metadata.get("report_date"),
        "lab_name": metadata.get("lab_name"),
        "report_status": metadata.get("report_status"),
        "biomarkers": {},
    }
    alias_items = sorted(
        aliases.items(),
        key=lambda item: (len(item[0].split()), len(item[0])),
        reverse=True,
    )
    for raw_line in text.splitlines():
        for line in biomarker_segments(raw_line, alias_items):
            if not line:
                continue
            words = words_for_match(line)
            match = find_alias(words, alias_items)
            if match is None:
                continue
            canonical_name, alias_word_count = match
            payload = parse_biomarker_line(line, alias_word_count)
            if payload.get("value") is not None:
                report["biomarkers"][canonical_name] = payload
    return normalize_report(report, aliases)


def parse_metadata(text: str, metadata_path: str | Path | None = None) -> dict[str, str | None]:
    path = Path(metadata_path).expanduser().resolve() if metadata_path else Path(__file__).with_name("metadata_fields.md")
    fields: dict[str, list[str]] = {}
    for field, aliases, _section in read_colon_bullets(path, {"Fields"}):
        values = [field]
        values.extend(alias.strip() for alias in aliases.split("|") if alias.strip())
        fields[field] = values
    all_labels = [label for labels in fields.values() for label in labels]
    result: dict[str, str | None] = {field: None for field in fields}
    for raw_line in text.splitlines():
        line = " ".join(raw_line.strip().split())
        if not line:
            continue
        line_key = normalize_text_key(line)
        for field, labels in fields.items():
            if result.get(field):
                continue
            extracted = extract_after_label(line, line_key, labels, all_labels)
            if extracted:
                result[field] = extracted
    return result


def extract_after_label(line: str, line_key: str, labels: list[str], all_labels: list[str]) -> str | None:
    lower_line = line.lower()
    compact_line = lower_line.replace(" ", "")
    for label in labels:
        label_key = normalize_text_key(label)
        if not label_key:
            continue
        if line_key == label_key:
            continue
        if line_key.startswith(label_key + " "):
            start = len(label)
            value = line[start:].strip(" :-\t")
            return clean_optional_text(trim_at_next_label(value, all_labels))
        marker = f"{label}:"
        marker_index = lower_line.find(marker.lower())
        if marker_index == 0:
            value = line[len(marker) :].strip(" :-\t")
            return clean_optional_text(trim_at_next_label(value, all_labels))
        compact_marker = marker.lower().replace(" ", "")
        if compact_line.startswith(compact_marker) and ":" in line:
            value = line[line.find(":") + 1 :].strip(" :-\t")
            return clean_optional_text(trim_at_next_label(value, all_labels))
    return None


def trim_at_next_label(value: str, labels: list[str]) -> str:
    lower_value = value.lower()
    cut_at: int | None = None
    for label in labels:
        marker = f"{label.lower()}:"
        index = lower_value.find(marker)
        if index > 0 and (cut_at is None or index < cut_at):
            cut_at = index
    if cut_at is None:
        return value
    return value[:cut_at].strip(" :-\t")


def biomarker_segments(raw_line: str, alias_items: list[tuple[str, str]]) -> list[str]:
    line = " ".join(raw_line.strip().split())
    if not line:
        return []
    positions = alias_positions(line, alias_items)
    if len(positions) <= 1:
        return [line]
    segments = []
    for index, start in enumerate(positions):
        end = positions[index + 1] if index + 1 < len(positions) else len(line)
        segment = line[start:end].strip(" ,;")
        if segment:
            segments.append(segment)
    return segments


def alias_positions(line: str, alias_items: list[tuple[str, str]]) -> list[int]:
    lower_line = line.lower()
    positions: list[tuple[int, int]] = []
    for alias, _canonical in alias_items:
        needle = alias.lower()
        start = lower_line.find(needle)
        while start >= 0:
            end = start + len(needle)
            if has_word_boundary(lower_line, start, end):
                positions.append((start, len(needle)))
            start = lower_line.find(needle, start + 1)
    positions.sort(key=lambda item: (item[0], -item[1]))
    selected: list[tuple[int, int]] = []
    for start, length in positions:
        if selected and start < selected[-1][0] + selected[-1][1]:
            continue
        selected.append((start, length))
    return [start for start, _length in selected]


def has_word_boundary(value: str, start: int, end: int) -> bool:
    before_ok = start == 0 or not value[start - 1].isalnum()
    after_ok = end >= len(value) or not value[end].isalnum()
    return before_ok and after_ok


def find_alias(words: list[str], alias_items: list[tuple[str, str]]) -> tuple[str, int] | None:
    for alias, canonical in alias_items:
        phrase = alias.split()
        if contains_phrase(words, phrase):
            return canonical, len(phrase)
    return None


def contains_phrase(words: list[str], phrase: list[str]) -> bool:
    if not phrase or len(phrase) > len(words):
        return False
    last_start = len(words) - len(phrase)
    for start in range(last_start + 1):
        if words[start : start + len(phrase)] == phrase:
            return True
    return False


def parse_biomarker_line(line: str, alias_word_count: int) -> dict[str, Any]:
    tokens = [token.strip() for token in line.split() if token.strip()]
    value_index = first_numeric_index(tokens, alias_word_count)
    value = to_float(tokens[value_index]) if value_index is not None else None
    unit = unit_after_value(tokens, value_index)
    ref_range = ref_range_after_value(tokens, value_index)
    flag = flag_from_tokens(tokens)
    return {
        "value": value,
        "unit": unit,
        "ref_range": ref_range,
        "flag": flag,
    }


def first_numeric_index(tokens: list[str], alias_word_count: int) -> int | None:
    start = max(0, alias_word_count)
    for index in range(start, len(tokens)):
        if to_float(tokens[index]) is not None:
            return index
    for index, token in enumerate(tokens):
        if to_float(token) is not None:
            return index
    return None


def unit_after_value(tokens: list[str], value_index: int | None) -> str | None:
    if value_index is None:
        return None
    next_index = value_index + 1
    if next_index >= len(tokens):
        return None
    candidate = clean_token(tokens[next_index])
    if not candidate:
        return None
    if looks_like_range(candidate) or normalize_flag(candidate):
        return None
    return candidate


def ref_range_after_value(tokens: list[str], value_index: int | None) -> str | None:
    if value_index is None:
        return None
    for token in tokens[value_index + 1 :]:
        clean = clean_token(token)
        if looks_like_range(clean):
            return clean
    return None


def flag_from_tokens(tokens: list[str]) -> str | None:
    for token in reversed(tokens):
        flag = normalize_flag(clean_token(token))
        if flag:
            return flag
    return None


def looks_like_range(token: str) -> bool:
    if not token:
        return False
    has_digit = any(character.isdigit() for character in token)
    if not has_digit:
        return False
    return "-" in token or token.startswith("<") or token.startswith(">")


def clean_token(token: str) -> str:
    return token.strip().strip(",;()[]")


def words_for_match(value: str) -> list[str]:
    separators = ",;:()[]{}|/"
    cleaned = []
    for character in value.lower().replace("_", " ").replace("-", " "):
        cleaned.append(" " if character in separators else character)
    return [word for word in "".join(cleaned).split() if word]
