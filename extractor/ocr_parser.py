from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .pdf_to_images import pdf_to_images


@dataclass(frozen=True)
class OcrResult:
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


def extract_text_from_pdf(pdf_path: str | Path, output_dir: str | Path, dpi: int = 200) -> OcrResult:
    try:
        images = pdf_to_images(pdf_path, output_dir, dpi=dpi)
    except Exception as exc:
        return OcrResult("", "paddleocr", "image_render_failed", str(exc))
    return extract_text_from_images(images)


def extract_text_from_images(image_paths: list[str | Path]) -> OcrResult:
    os.environ.setdefault("FLAGS_use_mkldnn", "0")
    os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        return OcrResult("", "paddleocr", "missing_dependency", str(exc))

    try:
        try:
            ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        except Exception:
            ocr = PaddleOCR(use_textline_orientation=True, lang="en", show_log=False)
        chunks: list[str] = []
        for image_path in image_paths:
            resolved = str(Path(image_path).expanduser().resolve())
            result = run_ocr(ocr, resolved)
            chunks.extend(collect_strings(result))
        text = "\n".join(item for item in chunks if item.strip())
        return OcrResult(text, "paddleocr", "ok")
    except Exception as exc:
        return OcrResult("", "paddleocr", "failed", str(exc))


def run_ocr(ocr: object, image_path: str) -> object:
    ocr_method = getattr(ocr, "ocr", None)
    if callable(ocr_method):
        try:
            return ocr_method(image_path, cls=True)
        except TypeError:
            try:
                return ocr_method(image_path)
            except TypeError:
                pass
    predict_method = getattr(ocr, "predict", None)
    if callable(predict_method):
        return predict_method(image_path)
    raise RuntimeError("PaddleOCR object has no supported OCR method")


def collect_strings(value: object) -> list[str]:
    strings: list[str] = []
    if isinstance(value, str):
        clean = value.strip()
        if clean:
            strings.append(clean)
    elif isinstance(value, dict):
        for item in value.values():
            strings.extend(collect_strings(item))
    elif hasattr(value, "json") and callable(getattr(value, "json")):
        strings.extend(collect_strings(value.json()))
    elif hasattr(value, "res"):
        strings.extend(collect_strings(getattr(value, "res")))
    elif hasattr(value, "text"):
        strings.extend(collect_strings(getattr(value, "text")))
    elif isinstance(value, (list, tuple)):
        for item in value:
            strings.extend(collect_strings(item))
    return strings
