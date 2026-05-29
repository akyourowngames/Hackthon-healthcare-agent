# Healthcare Agent Policy

Runtime knobs live here so the terminal agent can be tuned without changing
code.

## Storage

- database_path: storage/health_agent.db
- reports_dir: storage/reports
- input_dir: input
- default_output_dir: output
- supported_extensions: .pdf | .json | .txt | .md | .png | .jpg | .jpeg | .webp | .heic | .bmp | .tif | .tiff
- image_extensions: .png | .jpg | .jpeg | .webp | .heic | .bmp | .tif | .tiff
- default_user_id: local-user
- fresh_upload_window_seconds: 900
- fresh_upload_importance: 0.95

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

## Insights

- trend_min_points: 3
- baseline_min_points: 3
- baseline_zscore: 2
- baseline_min_relative_change: 0.2
- urgent_zscore: 3
- health_score_abnormal_penalty: 9
- health_score_watch_penalty: 4
- health_score_concern_penalty: 9
- health_score_urgent_penalty: 16

## Sharing

- share_expiry_days: 7

## Supabase

- enabled: false
- url:
- service_role_key:
- timeout_seconds: 8
- sync_async: true

## Memory

- enabled: true
- session_history_messages: 12
- recall_limit: 6
- context_chars: 2200
- auto_store_turns: true
- min_text_chars: 3
- importance_default: 0.7
- rank_semantic_weight: 0.62
- rank_importance_weight: 0.12
- rank_overlap_weight: 0.18
- rank_session_weight: 0.08
- summary_exchange_interval: 10
- summary_max_messages: 20
- summary_max_chars: 1400
