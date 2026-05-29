from __future__ import annotations


def detect_language(text: str, preference: str = "auto") -> str:
    requested = normalize_language_preference(preference)
    if requested in {"en", "hi"}:
        return requested

    sample = str(text or "").strip()
    if not sample:
        return "en"
    if has_devanagari(sample):
        return "hi"
    try:
        from langdetect import detect

        detected = str(detect(sample) or "").lower()
    except Exception:
        detected = ""
    if detected.startswith("hi"):
        return "hi"
    return "en"


def normalize_language_preference(value: str | None) -> str:
    clean = str(value or "auto").strip().lower()
    if clean in {"english", "en"}:
        return "en"
    if clean in {"hindi", "hi"}:
        return "hi"
    return "auto"


def language_instruction(language: str, preference: str = "auto") -> str:
    selected = detect_language(language, preference) if language not in {"en", "hi"} else language
    normalized_preference = normalize_language_preference(preference)
    if selected == "hi":
        return (
            "The user wants Hindi or Hinglish. Reply in the same style, using simple everyday Hindi "
            "with English medical terms when they are clearer."
        )
    if normalized_preference == "auto":
        return (
            "Mirror the user's language style. If the user writes Hinglish, answer in natural Hinglish; "
            "if the user writes English, answer in English."
        )
    return "The user wants English. Reply in clear, natural English."


def has_devanagari(value: str) -> bool:
    for character in str(value or ""):
        if "\u0900" <= character <= "\u097f":
            return True
    return False
