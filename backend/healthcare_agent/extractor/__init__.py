from __future__ import annotations

from pathlib import Path


ROOT_EXTRACTOR = Path(__file__).resolve().parents[2] / "extractor"
__path__ = [str(ROOT_EXTRACTOR)]
