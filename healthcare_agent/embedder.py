from __future__ import annotations

import contextlib
import hashlib
import io
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np

from .config import AgentSettings, load_agent_settings


@dataclass(frozen=True)
class EmbeddingResult:
    vectors: np.ndarray
    provider: str


_local_session = None
_local_tokenizer = None
_local_failed = False


def embed_texts(texts: str | list[str], settings: AgentSettings | None = None) -> EmbeddingResult:
    active_settings = settings or load_agent_settings()
    single = isinstance(texts, str)
    batch = [texts] if single else list(texts)
    clean_batch = [text if str(text or "").strip() else "." for text in batch]

    if active_settings.local_primary:
        local_vectors = _local_embed(clean_batch, active_settings)
        if local_vectors is not None:
            return EmbeddingResult(_single_if_needed(local_vectors, single), "local_onnx")

    remote_vectors = _remote_embed(clean_batch, active_settings)
    if remote_vectors is not None:
        return EmbeddingResult(_single_if_needed(remote_vectors, single), "nvidia")

    fallback = _hash_embed(clean_batch, active_settings.embedding_dim)
    return EmbeddingResult(_single_if_needed(fallback, single), "local_hash")


def _single_if_needed(vectors: np.ndarray, single: bool) -> np.ndarray:
    if single:
        return vectors[0]
    return vectors


def _quiet_call(func, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return func(*args, **kwargs)


def _cached_file(settings: AgentSettings, filename: str) -> Path | None:
    if not settings.cache_dir.exists():
        return None
    expected = Path(filename).name
    repo_marker = "models--" + settings.local_model_repo.replace("/", "--")
    for path in settings.cache_dir.rglob(expected):
        if repo_marker not in path.parts:
            continue
        if str(path).replace("\\", "/").endswith(filename):
            return path
    return None


def _download_hf_file(settings: AgentSettings, filename: str) -> Path:
    from huggingface_hub import hf_hub_download

    return Path(
        _quiet_call(
            hf_hub_download,
            repo_id=settings.local_model_repo,
            filename=filename,
            cache_dir=settings.cache_dir,
        )
    )


def _local_model(settings: AgentSettings):
    global _local_failed, _local_session
    if _local_failed:
        return None
    if _local_session is not None:
        return _local_session
    try:
        import onnxruntime as rt

        model_path = _cached_file(settings, settings.local_model_file)
        if model_path is None:
            model_path = _download_hf_file(settings, settings.local_model_file)
        _local_session = rt.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        return _local_session
    except Exception:
        _local_failed = True
        return None


def _tokenizer(settings: AgentSettings):
    global _local_tokenizer
    if _local_tokenizer is not None:
        return _local_tokenizer
    import tokenizers

    tokenizer_path = _cached_file(settings, settings.tokenizer_file)
    if tokenizer_path is None:
        tokenizer_path = _download_hf_file(settings, settings.tokenizer_file)
    _local_tokenizer = tokenizers.Tokenizer.from_file(str(tokenizer_path))
    return _local_tokenizer


def _local_embed(texts: list[str], settings: AgentSettings) -> np.ndarray | None:
    model = _local_model(settings)
    if model is None:
        return None
    try:
        tokenizer = _tokenizer(settings)
        encoded = tokenizer.encode_batch(texts)
        max_len = min(
            settings.max_tokens,
            max((len(item.ids) for item in encoded), default=1),
        )
        input_ids = []
        attention_mask = []
        token_type_ids = []
        for item in encoded:
            ids = list(item.ids[:max_len])
            mask = list(item.attention_mask[:max_len])
            types = list(item.type_ids[:max_len])
            pad_count = max_len - len(ids)
            if pad_count > 0:
                ids.extend([0] * pad_count)
                mask.extend([0] * pad_count)
                types.extend([0] * pad_count)
            input_ids.append(ids)
            attention_mask.append(mask)
            token_type_ids.append(types)

        feeds = {
            "input_ids": np.array(input_ids, dtype=np.int64),
            "attention_mask": np.array(attention_mask, dtype=np.int64),
            "token_type_ids": np.array(token_type_ids, dtype=np.int64),
        }
        input_names = {item.name for item in model.get_inputs()}
        filtered_feeds = {name: value for name, value in feeds.items() if name in input_names}
        outputs = model.run(None, filtered_feeds)
        token_embeddings = np.asarray(outputs[0], dtype=np.float32)
        mask_array = np.array(attention_mask, dtype=np.float32)
        mask_expanded = np.expand_dims(mask_array, -1)
        summed = np.sum(token_embeddings * mask_expanded, axis=1)
        counts = np.clip(np.sum(mask_expanded, axis=1), a_min=1e-9, a_max=None)
        return _normalize(summed / counts)
    except Exception:
        return None


def _remote_embed(texts: list[str], settings: AgentSettings) -> np.ndarray | None:
    if not settings.nvidia_api_key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.nvidia_api_key,
            base_url=settings.nvidia_base_url,
            timeout=settings.timeout_seconds,
            max_retries=0,
        )
        response = client.embeddings.create(model=settings.nvidia_model, input=texts)
        vectors = np.array([item.embedding for item in response.data], dtype=np.float32)
        return _normalize(vectors)
    except Exception:
        return None


def _hash_embed(texts: Iterable[str], dim: int) -> np.ndarray:
    vectors = []
    safe_dim = max(8, int(dim))
    for text in texts:
        vector = np.zeros(safe_dim, dtype=np.float32)
        for term in _terms(text):
            digest = hashlib.sha1(term.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % safe_dim
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        if not np.any(vector):
            vector[0] = 1.0
        vectors.append(vector)
    return _normalize(np.vstack(vectors))


def _terms(text: str) -> list[str]:
    terms = []
    current = []
    for character in str(text or "").casefold():
        if character.isalnum():
            current.append(character)
            continue
        if current:
            terms.append("".join(current))
            current = []
    if current:
        terms.append("".join(current))
    return [term for term in terms if len(term) > 1]


def _normalize(vectors: np.ndarray) -> np.ndarray:
    array = np.asarray(vectors, dtype=np.float32)
    if array.ndim == 1:
        array = array.reshape(1, -1)
    norms = np.linalg.norm(array, axis=1, keepdims=True)
    return np.divide(array, norms, out=np.zeros_like(array), where=norms != 0)
