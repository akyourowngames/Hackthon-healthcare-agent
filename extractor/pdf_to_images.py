from __future__ import annotations

from pathlib import Path

from .utils import ensure_dir, safe_stem


def pdf_to_images(pdf_path: str | Path, output_dir: str | Path, dpi: int = 150) -> list[Path]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required for PDF image rendering") from exc

    source = Path(pdf_path).expanduser().resolve()
    target_dir = ensure_dir(output_dir)
    images: list[Path] = []
    document = fitz.open(str(source))
    try:
        zoom = dpi / 72
        matrix = fitz.Matrix(zoom, zoom)
        stem = safe_stem(source)
        for page_index in range(len(document)):
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            image_path = target_dir / f"{stem}_page_{page_index + 1:03d}.png"
            pixmap.save(str(image_path))
            images.append(image_path)
    finally:
        document.close()
    return images


def extract_text_layer(pdf_path: str | Path) -> str:
    return "\n".join(extract_page_text_layers(pdf_path))


def extract_page_text_layers(pdf_path: str | Path) -> list[str]:
    try:
        import fitz
    except ImportError:
        return []

    source = Path(pdf_path).expanduser().resolve()
    document = fitz.open(str(source))
    try:
        chunks: list[str] = []
        for page in document:
            chunks.append(page.get_text() or "")
        return chunks
    finally:
        document.close()
