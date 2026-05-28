# Healthcare Agent API Policy

Runtime knobs for the local API server live here so the web frontend can talk
to the same agent used by the terminal shell.

## Server

- host: 127.0.0.1
- port: 8000
- cors_origins: http://localhost:3000 | http://127.0.0.1:3000 | http://localhost:3001 | http://127.0.0.1:3001
- stream_keepalive_seconds: 10
- warmup_on_start: true
