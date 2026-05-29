# Extraction Policy

Runtime knobs live here so the extractor can be tuned without changing code.

## Text Quality

- min_chars: 120
- min_digits: 6
- min_lines: 1
- min_letters: 20
- min_letter_ratio: 0.05

## Runtime

- default_dpi: 120
- scanned_dpi: 200
- latest_output_name: report.json

## NIM

- model: nvidia/llama-3.1-nemotron-nano-vl-8b-v1
- fallback_model:
- timeout_seconds: 45
- text_timeout_seconds: 60
- max_tokens: 700
- text_max_tokens: 1800
- temperature: 0
- page_sleep_seconds: 0
- retry_attempts: 3
- retry_backoff_seconds: 5

## Page Filter

- min_chars: 50
- min_digits: 1
