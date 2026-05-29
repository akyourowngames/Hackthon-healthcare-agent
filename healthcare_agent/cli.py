from __future__ import annotations

import argparse
import json
import sys
import threading
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from extractor.main import run_pipeline
from extractor.utils import normalize_label, read_colon_bullets

from healthcare_agent.chat import chat_response, warm_chat_model
from healthcare_agent.config import load_agent_settings
from healthcare_agent.ingest import ensure_agent_folders, process_input_folder
from healthcare_agent.memory import ensure_session, initialize_memory, memory_assessment
from healthcare_agent.store import (
    answer_question,
    copy_source_to_storage,
    deduplicate_reports,
    get_report,
    import_existing_output,
    initialize_database,
    list_reports,
    save_report,
    search_reports,
)


def main(argv: list[str] | None = None) -> int:
    configure_output_encoding()
    parser = build_parser()
    args = parser.parse_args(argv)
    if not hasattr(args, "handler"):
        return run_agent_shell()
    try:
        return int(args.handler(args) or 0)
    except Exception as exc:
        print(f"Failure: {exc}")
        return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="vaidy-agent",
        description="Terminal AI healthcare agent for local report memory.",
    )
    subparsers = parser.add_subparsers(dest="command")

    status = subparsers.add_parser("status", help="Show local agent storage status.")
    status.set_defaults(handler=handle_status)

    ingest = subparsers.add_parser("ingest", help="Extract and store a report PDF locally.")
    ingest.add_argument("pdf_path", help="Path to the report PDF.")
    ingest.add_argument("--local-only", action="store_true", help="Skip NIM extraction and use local fallbacks.")
    ingest.add_argument("--output-dir", default=None, help="Output directory for extractor artifacts.")
    ingest.set_defaults(handler=handle_ingest)

    import_json = subparsers.add_parser("import-json", help="Store an existing extractor JSON output.")
    import_json.add_argument("json_path", help="Path to an existing report JSON file.")
    import_json.add_argument("--source-path", default=None, help="Original source report path when known.")
    import_json.set_defaults(handler=handle_import_json)

    process_input = subparsers.add_parser("process-input", help="Process every supported file in the input folder.")
    process_input.add_argument("--local-only", action="store_true", help="Skip NIM extraction and use local fallbacks.")
    process_input.set_defaults(handler=handle_process_input)

    list_cmd = subparsers.add_parser("list", help="List stored local reports.")
    list_cmd.set_defaults(handler=handle_list)

    dedupe = subparsers.add_parser("dedupe", help="Remove exact duplicate report records from local memory.")
    dedupe.set_defaults(handler=handle_dedupe)

    show = subparsers.add_parser("show", help="Show one stored report.")
    show.add_argument("report_id", type=int, help="Local report ID.")
    show.set_defaults(handler=handle_show)

    search = subparsers.add_parser("search", help="Search stored report evidence.")
    search.add_argument("query", help="Search question or phrase.")
    search.add_argument("--limit", type=int, default=None, help="Maximum chunks to return.")
    search.set_defaults(handler=handle_search)

    ask = subparsers.add_parser("ask", help="Answer from local report evidence.")
    ask.add_argument("query", help="Question to answer from local reports.")
    ask.add_argument("--limit", type=int, default=None, help="Maximum evidence chunks to use.")
    ask.add_argument("--language", default="auto", help="Language preference to pass to the chat agent.")
    ask.set_defaults(handler=handle_ask)

    return parser


def handle_status(_args: argparse.Namespace) -> int:
    settings = load_agent_settings()
    ensure_agent_folders(settings)
    db_path = initialize_database(settings)
    initialize_memory(settings)
    report_count = len(list_reports(settings))
    memory = memory_assessment(settings)
    print("Vaidy terminal healthcare agent")
    print(f"database: {db_path}")
    print(f"input_dir: {settings.input_dir}")
    print(f"reports_dir: {settings.reports_dir}")
    print(f"default_output_dir: {settings.default_output_dir}")
    print(f"supported_extensions: {', '.join(settings.supported_extensions)}")
    print(f"local_primary_embeddings: {settings.local_primary}")
    print(f"onnx_model_repo: {settings.local_model_repo}")
    print(f"nvidia_embedding_fallback: {settings.nvidia_model}")
    print(f"chat_model: {settings.chat_model}")
    print(f"chat_fast_model: {settings.chat_fast_model}")
    print(f"chat_report_model: {settings.chat_report_model}")
    print(f"chat_streaming: {settings.chat_streaming}")
    print(f"stored_reports: {report_count}")
    print(f"memory_sessions: {memory['sessions']}")
    print(f"memory_messages: {memory['messages']}")
    print(f"memory_entries: {memory['entries']}")
    return 0


def handle_ingest(args: argparse.Namespace) -> int:
    settings = load_agent_settings()
    output_dir = args.output_dir or settings.default_output_dir
    result = run_pipeline(
        args.pdf_path,
        output_dir=output_dir,
        local_only=args.local_only,
    )
    payload = json.loads(Path(result["output_path"]).read_text(encoding="utf-8"))
    copy_source_to_storage(args.pdf_path, settings)
    report_id = save_report(payload, args.pdf_path, result["output_path"], settings)
    print(f"stored_report_id: {report_id}")
    print(f"extractor_source: {result['source']}")
    print(f"biomarkers: {result['biomarker_count']}")
    print(f"output_path: {result['output_path']}")
    return 0


def handle_import_json(args: argparse.Namespace) -> int:
    settings = load_agent_settings()
    report_id = import_existing_output(args.json_path, args.source_path, settings)
    print(f"stored_report_id: {report_id}")
    print(f"json_path: {Path(args.json_path).expanduser().resolve()}")
    return 0


def handle_process_input(args: argparse.Namespace) -> int:
    settings = load_agent_settings()
    summary = process_input_folder(settings, local_only=args.local_only)
    print_process_summary(summary)
    return 1 if summary.failed else 0


def handle_list(_args: argparse.Namespace) -> int:
    reports = list_reports()
    if not reports:
        print("No local reports stored yet.")
        return 0
    for report in reports:
        patient = report.get("patient_name") or "unknown patient"
        date = report.get("report_date") or "unknown date"
        lab = report.get("lab_name") or "unknown lab"
        count = report.get("biomarker_count")
        print(f"{report['id']}: {patient} | {date} | {lab} | biomarkers={count}")
    return 0


def handle_dedupe(_args: argparse.Namespace) -> int:
    result = deduplicate_reports()
    print(f"removed_duplicates: {result['removed_count']}")
    if result["removed"]:
        print(f"removed_report_ids: {', '.join(str(item) for item in result['removed'])}")
    return 0


def handle_show(args: argparse.Namespace) -> int:
    record = get_report(args.report_id)
    if record is None:
        print(f"Report not found: {args.report_id}")
        return 1
    report = record["report"]
    print(f"report_id: {record['id']}")
    print(f"patient: {record.get('patient_name') or 'unknown'}")
    print(f"date: {record.get('report_date') or 'unknown'}")
    print(f"lab: {record.get('lab_name') or 'unknown'}")
    print(f"stored_json: {record.get('stored_json_path')}")
    print("biomarkers:")
    for name, value in sorted((report.get("biomarkers") or {}).items()):
        if not isinstance(value, dict):
            continue
        parts = []
        if value.get("value") is not None:
            parts.append(str(value.get("value")))
        if value.get("unit"):
            parts.append(str(value.get("unit")))
        if value.get("ref_range"):
            parts.append(f"ref {value.get('ref_range')}")
        if value.get("flag"):
            parts.append(f"flag {value.get('flag')}")
        detail = " ".join(parts) if parts else "no structured value"
        print(f"- {name}: {detail}")
    return 0


def handle_search(args: argparse.Namespace) -> int:
    hits = search_reports(args.query, limit=args.limit)
    if not hits:
        print("No local report evidence matched.")
        return 0
    for hit in hits:
        print(f"{hit.score:.4f} | report {hit.report_id} | {hit.text}")
    return 0


def handle_ask(args: argparse.Namespace) -> int:
    result = print_chat_response(
        args.query,
        force_report_context=True,
        language_preference=args.language,
    )
    if not result.text:
        print()
    return 0


def run_agent_shell() -> int:
    settings = load_agent_settings()
    ensure_agent_folders(settings)
    initialize_database(settings)
    initialize_memory(settings)
    session_id = ensure_session(settings=settings)
    commands = load_agent_commands()
    history: list[dict[str, str]] = []
    start_chat_warmup(settings)
    print("Vaidy agent is ready.")
    print(f"Put reports or documents in: {settings.input_dir}")
    print(f"Extraction results save to: {settings.default_output_dir}")
    print("Type naturally, or use /process, /list, /show <id>, /search <query>, /ask <query>, /status, /help, /exit.")
    while True:
        try:
            raw = input("vaidy> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            return 0
        if not raw:
            continue
        result = handle_agent_message(raw, settings, commands, history, session_id=session_id)
        if result == "exit":
            return 0


def handle_agent_message(
    raw: str,
    settings,
    commands: dict[str, list[str]],
    history: list[dict[str, str]] | None = None,
    session_id: str | None = None,
) -> str:
    command, value = resolve_agent_command(raw, commands)
    if command == "exit":
        print("Goodbye.")
        return "exit"
    if command == "help":
        print("Commands: /process, /list, /show <id>, /search <query>, /ask <query>, /status, /help, /exit")
        print(f"Input folder: {settings.input_dir}")
        print(f"Output folder: {settings.default_output_dir}")
        return "handled"
    if command == "status":
        handle_status(argparse.Namespace())
        return "handled"
    if command == "process_input":
        summary = process_input_folder(settings, local_only="--local-only" in raw.split())
        print_process_summary(summary)
        return "handled"
    if command == "list_reports":
        handle_list(argparse.Namespace())
        return "handled"
    if command == "dedupe":
        handle_dedupe(argparse.Namespace())
        return "handled"
    if command == "show":
        if not value or not value.isdigit():
            print("Give me a report id, for example: /show 1")
            return "handled"
        handle_show(argparse.Namespace(report_id=int(value)))
        return "handled"
    if command == "search":
        if not value:
            print("Give me something to search for.")
            return "handled"
        handle_search(argparse.Namespace(query=value, limit=None))
        return "handled"
    if command == "ask":
        if not value:
            print("Ask a question after /ask.")
            return "handled"
        result = print_chat_response(value, settings=settings, history=history or [], force_report_context=True, session_id=session_id)
        remember_turn(history, value, result.text)
        return "handled"
    result = print_chat_response(raw, settings=settings, history=history or [], session_id=session_id)
    remember_turn(history, raw, result.text)
    return "handled"


def print_chat_response(message: str, **kwargs):
    streamed = False

    def on_chunk(chunk: str) -> None:
        nonlocal streamed
        streamed = True
        print(chunk, end="", flush=True)

    result = chat_response(message, on_chunk=on_chunk, **kwargs)
    if streamed:
        print()
    else:
        print(result.text)
    return result


def start_chat_warmup(settings) -> None:
    if not getattr(settings, "chat_warmup_on_start", False):
        return
    thread = threading.Thread(target=warm_chat_model, args=(settings,), daemon=True)
    thread.start()


def configure_output_encoding() -> None:
    for stream in (sys.stdout, sys.stderr):
        if not hasattr(stream, "reconfigure"):
            continue
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            try:
                stream.reconfigure(errors="replace")
            except Exception:
                pass


def remember_turn(history: list[dict[str, str]] | None, user_text: str, assistant_text: str) -> None:
    if history is None:
        return
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": assistant_text})


def resolve_agent_command(raw: str, commands: dict[str, list[str]]) -> tuple[str, str]:
    text = raw.strip()
    if not text:
        return "", ""
    if text.startswith("/"):
        parts = text[1:].split(maxsplit=1)
        command = resolve_command_alias(parts[0], commands) if parts else ""
        value = parts[1].strip() if len(parts) > 1 else ""
        return command, value
    normalized = " ".join(text.casefold().split())
    command = resolve_command_alias(normalized, commands)
    if command:
        return command, ""
    parts = normalized.split()
    if len(parts) == 3 and parts[0] == "show" and parts[1] == "report":
        return "show", parts[2]
    return "", ""


def resolve_command_alias(value: str, commands: dict[str, list[str]]) -> str:
    normalized = " ".join(str(value or "").casefold().split())
    normalized_key = normalize_label(normalized)
    for command, phrases in commands.items():
        if normalized_key == command or normalized in phrases:
            return command
    return normalized_key


def load_agent_commands() -> dict[str, list[str]]:
    path = Path(__file__).with_name("agent_commands.md")
    entries = read_colon_bullets(path, {"Commands"})
    commands: dict[str, list[str]] = {}
    for key, value, _section in entries:
        phrases = [" ".join(item.casefold().split()) for item in value.split("|") if item.strip()]
        commands[normalize_label(key)] = phrases
    return commands


def print_process_summary(summary) -> None:
    if summary.touched == 0:
        print(f"No supported files found in input: {summary.input_dir}")
        return
    print(f"Input: {summary.input_dir}")
    print(f"Output: {summary.output_dir}")
    if summary.processed:
        print(f"Processed {len(summary.processed)} file(s):")
        for item in summary.processed:
            print(f"- report {item.get('report_id')}: {Path(item.get('path', '')).name} -> {item.get('output_path')}")
    if summary.skipped:
        print(f"Skipped {len(summary.skipped)} file(s):")
        for item in summary.skipped:
            print(f"- {Path(item.get('path', '')).name}: {item.get('reason')}")
    if summary.failed:
        print(f"Failed {len(summary.failed)} file(s):")
        for item in summary.failed:
            print(f"- {Path(item.get('path', '')).name}: {item.get('error')}")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
