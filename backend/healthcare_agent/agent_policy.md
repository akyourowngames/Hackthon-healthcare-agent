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

## Chat

- model: meta/llama-4-maverick-17b-128e-instruct
- fast_model: meta/llama-3.1-8b-instruct
- report_model: meta/llama-3.1-8b-instruct
- fallback_model: nvidia/nemotron-mini-4b-instruct
- timeout_seconds: 60
- max_tokens: 700
- temperature: 0.3
- streaming: true
- fast_lane_for_casual: true
- fast_lane_for_reports: true
- warmup_on_start: true
- history_messages: 8
- evidence_limit: 5
- report_context_min_chars: 4
- report_context_margin: 0.05
