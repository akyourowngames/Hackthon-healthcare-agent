from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class TextExtractionResult:
    text: str
    extractor: str
    status: str
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "extractor": self.extractor,
            "status": self.status,
            "error": self.error,
            "chars": len(self.text or ""),
        }


def extract_text(pdf_path: str | Path) -> TextExtractionResult:
    try:
        from docling.document_converter import DocumentConverter
    except ImportError:
        return TextExtractionResult("", "docling", "missing_dependency")

    source = Path(pdf_path).expanduser().resolve()
    try:
        converter = DocumentConverter()
        converted = converter.convert(str(source))
        document = getattr(converted, "document", converted)
        text = export_document_text(document)
        return TextExtractionResult(text, "docling", "ok")
    except Exception as exc:
        return TextExtractionResult("", "docling", "failed", str(exc))


def export_document_text(document: object) -> str:
    for method_name in ("export_to_markdown", "export_to_text"):
        method = getattr(document, method_name, None)
        if callable(method):
            text = method()
            if text:
                return str(text)
    return str(document or "")
