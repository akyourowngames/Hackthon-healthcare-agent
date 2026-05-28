# Healthcare Agent Policy

Runtime knobs live here so the terminal agent can be tuned without changing
code.

## Storage

- database_path: storage/health_agent.db
- reports_dir: storage/reports
- input_dir: input
- default_output_dir: output
- supported_extensions: .pdf | .json | .txt | .md

## Embeddings

- local_primary: true
- local_model_repo: Xenova/all-MiniLM-L6-v2
- local_model_file: onnx/model.onnx
- tokenizer_file: tokenizer.json
- cache_dir: storage/onnx_models
- embedding_dim: 384
- max_tokens: 256
- nvidia_model: nvidia/nv-embed-v1
- timeout_seconds: 12
- search_limit: 5
