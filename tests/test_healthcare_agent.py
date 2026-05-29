from __future__ import annotations

import json
import os
import base64
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

from healthcare_agent import chat, cli, embedder, memory, store, supabase_sync
from healthcare_agent.config import AgentSettings
from healthcare_agent.embedder import EmbeddingResult


def temp_settings(root: Path) -> AgentSettings:
    return AgentSettings(
        database_path=root / "health_agent.db",
        reports_dir=root / "reports",
        input_dir=root / "input",
        default_output_dir=root / "output",
        supported_extensions=(".pdf", ".json", ".txt", ".md"),
        image_extensions=(".png", ".jpg", ".jpeg", ".webp", ".heic", ".bmp", ".tif", ".tiff"),
        fresh_upload_window_seconds=900,
        fresh_upload_importance=0.95,
        default_user_id="local-user",
        local_primary=True,
        local_model_repo="Xenova/all-MiniLM-L6-v2",
        local_model_file="onnx/model.onnx",
        tokenizer_file="tokenizer.json",
        cache_dir=root / "onnx_models",
        embedding_dim=8,
        max_tokens=32,
        nvidia_model="nvidia/nv-embed-v1",
        timeout_seconds=1,
        search_limit=3,
        nvidia_api_key="",
        nvidia_base_url="https://integrate.api.nvidia.com/v1",
        chat_model="meta/llama-4-maverick-17b-128e-instruct",
        chat_fast_model="meta/llama-3.1-8b-instruct",
        chat_report_model="meta/llama-3.1-8b-instruct",
        chat_fallback_model="nvidia/nemotron-mini-4b-instruct",
        chat_timeout_seconds=1,
        chat_max_tokens=80,
        chat_temperature=0.3,
        chat_streaming=True,
        chat_fast_lane_for_casual=True,
        chat_fast_lane_for_reports=True,
        chat_warmup_on_start=False,
        chat_history_messages=4,
        chat_evidence_limit=3,
        chat_report_context_min_chars=4,
        chat_report_context_margin=0.05,
        trend_min_points=3,
        baseline_min_points=3,
        baseline_zscore=2,
        baseline_min_relative_change=0.2,
        urgent_zscore=3,
        health_score_abnormal_penalty=9,
        health_score_watch_penalty=4,
        health_score_concern_penalty=9,
        health_score_urgent_penalty=16,
        share_expiry_days=7,
        supabase_enabled=False,
        supabase_url="",
        supabase_service_role_key="",
        supabase_storage_bucket="User Data",
        supabase_timeout_seconds=1,
        supabase_sync_async=True,
        memory_enabled=True,
        memory_session_history_messages=6,
        memory_recall_limit=4,
        memory_context_chars=900,
        memory_auto_store_turns=True,
        memory_min_text_chars=3,
        memory_importance_default=0.7,
        memory_rank_semantic_weight=0.62,
        memory_rank_importance_weight=0.12,
        memory_rank_overlap_weight=0.18,
        memory_rank_session_weight=0.08,
        memory_summary_exchange_interval=10,
        memory_summary_max_messages=20,
        memory_summary_max_chars=1400,
    )


def sample_report() -> dict:
    return {
        "patient_name": "Rohan Iyer",
        "report_date": "26-05-2026",
        "lab_name": "Bharat Health Lab",
        "biomarkers": {
            "triglycerides": {
                "value": 210.0,
                "unit": "mg/dL",
                "ref_range": "0-150",
                "flag": "HIGH",
            },
            "hemoglobin": {
                "value": 14.5,
                "unit": "g/dL",
                "ref_range": "13-17",
                "flag": "NORMAL",
            },
        },
    }


def trend_report(report_date: str, tsh: float, hemoglobin: float, tsh_flag: str = "NORMAL") -> dict:
    return {
        "patient_name": "Rohan Iyer",
        "report_date": report_date,
        "lab_name": "Bharat Health Lab",
        "biomarkers": {
            "tsh": {
                "value": tsh,
                "unit": "uIU/mL",
                "ref_range": "0.4-4.5",
                "flag": tsh_flag,
            },
            "hemoglobin": {
                "value": hemoglobin,
                "unit": "g/dL",
                "ref_range": "13-17",
                "flag": "LOW" if hemoglobin < 13 else "NORMAL",
            },
        },
    }


def fake_embeddings(texts, settings=None):
    batch = [texts] if isinstance(texts, str) else list(texts)
    vectors = []
    for text in batch:
        vector = np.zeros(8, dtype=np.float32)
        if "triglycerides" in str(text).casefold():
            vector[0] = 1.0
        elif "hemoglobin" in str(text).casefold():
            vector[1] = 1.0
        elif "tsh" in str(text).casefold():
            vector[3] = 1.0
        else:
            vector[2] = 1.0
        vectors.append(vector)
    matrix = np.vstack(vectors)
    if isinstance(texts, str):
        return EmbeddingResult(matrix[0], "test")
    return EmbeddingResult(matrix, "test")


def fake_jwt(role: str) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "none"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"role": role}).encode()).decode().rstrip("=")
    return f"{header}.{payload}.signature"


class HealthcareAgentTests(unittest.TestCase):
    def test_embedder_uses_local_onnx_before_remote(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        local = np.ones((1, 8), dtype=np.float32)
        with patch("healthcare_agent.embedder._local_embed", return_value=local) as local_embed:
            with patch("healthcare_agent.embedder._remote_embed", return_value=None) as remote_embed:
                result = embedder.embed_texts(["hello"], settings)
        self.assertEqual(result.provider, "local_onnx")
        self.assertEqual(local_embed.call_count, 1)
        self.assertEqual(remote_embed.call_count, 0)

    def test_embedder_uses_nvidia_when_local_is_unavailable(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        remote = np.ones((1, 8), dtype=np.float32)
        with patch("healthcare_agent.embedder._local_embed", return_value=None):
            with patch("healthcare_agent.embedder._remote_embed", return_value=remote) as remote_embed:
                result = embedder.embed_texts(["hello"], settings)
        self.assertEqual(result.provider, "nvidia")
        self.assertEqual(remote_embed.call_count, 1)

    def test_local_db_stores_report_chunks_and_answers(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            output_path = Path(temp_dir) / "report.json"
            output_path.write_text(json.dumps(sample_report()), encoding="utf-8")
            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                report_id = store.save_report(sample_report(), "report.pdf", output_path, settings)
                reports = store.list_reports(settings)
                hits = store.search_reports("triglycerides", settings=settings)
                answer = store.answer_question("triglycerides", settings=settings)
        self.assertEqual(report_id, 1)
        self.assertEqual(len(reports), 1)
        self.assertEqual(hits[0].report_id, 1)
        self.assertIn("triglycerides", answer)
        self.assertIn("local reports", answer)
        self.assertTrue(any("status abnormal" in chunk for chunk in store.report_chunks(sample_report())))

    def test_image_findings_are_searchable_chunks(self):
        payload = {
            "patient_name": "scan sample",
            "report_date": "2026-05-29",
            "report_status": "image",
            "summary": "Chest scan image could not be read reliably.",
            "findings": [
                {
                    "title": "image not analyzed",
                    "description": "The image is too small for reliable visual analysis.",
                    "severity": "watch",
                    "recommendation": "Upload a clearer scan.",
                }
            ],
            "biomarkers": {},
        }
        chunks = store.report_chunks(payload)
        joined = "\n".join(chunks)
        self.assertIn("summary Chest scan image could not be read reliably.", joined)
        self.assertIn("image finding 1", joined)
        self.assertIn("title image not analyzed", joined)

    def test_supabase_anon_key_requires_user_token_or_service_role(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        settings = AgentSettings(
            **{
                **settings.__dict__,
                "supabase_enabled": True,
                "supabase_url": "https://example.supabase.co",
                "supabase_service_role_key": fake_jwt("anon"),
            }
        )
        result = supabase_sync.sync_report_bundle(1, settings)
        self.assertEqual(result["reason"], "auth_token_or_service_role_required")

    def test_duplicate_report_payload_is_not_stored_twice(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            output_path = Path(temp_dir) / "report.json"
            output_path.write_text(json.dumps(sample_report()), encoding="utf-8")
            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                first_id = store.save_report(sample_report(), "report.pdf", output_path, settings)
                second_id = store.save_report(sample_report(), "report-copy.pdf", output_path, settings)
                reports = store.list_reports(settings)
        self.assertEqual(first_id, second_id)
        self.assertEqual(len(reports), 1)

    def test_fast_agent_answers_report_inventory_without_model(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            output_path = Path(temp_dir) / "report.json"
            output_path.write_text(json.dumps(sample_report()), encoding="utf-8")
            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                store.save_report(sample_report(), "report.pdf", output_path, settings)
                with patch("healthcare_agent.chat.call_chat_model") as call:
                    result = chat.chat_response(
                        "which report you have access to",
                        settings=settings,
                        language_preference="en",
                    )
        self.assertEqual(call.call_count, 0)
        self.assertEqual(result.model, "local-fast")
        self.assertIn("Rohan Iyer", result.text)

    def test_fast_agent_respects_hindi_language_preference(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        result = chat.chat_response("hi", settings=settings, language_preference="hi")
        self.assertEqual(result.model, "local-fast")
        self.assertIn("Main ready", result.text)

    def test_dashboard_anomaly_engine_tracks_history_and_share_links(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            settings = temp_settings(root)
            reports = [
                trend_report("01-01-2026", 1.2, 14.0),
                trend_report("01-03-2026", 2.4, 13.5),
                trend_report("01-05-2026", 3.8, 12.2, "HIGH"),
            ]
            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                for index, payload in enumerate(reports, start=1):
                    output_path = root / f"report-{index}.json"
                    output_path.write_text(json.dumps(payload), encoding="utf-8")
                    store.save_report(payload, f"report-{index}.json", output_path, settings)
                dashboard = store.dashboard_snapshot("local-user", settings)
                share = store.create_share_link("local-user", settings=settings)
                summary = store.get_share_summary(share["token"], settings)
                notifications = store.list_notifications("local-user", settings)
        finding_types = {item["finding_type"] for item in dashboard["anomalies"]}
        self.assertIn("trend", finding_types)
        self.assertIn("baseline_breach", finding_types)
        self.assertGreaterEqual(dashboard["health_score"]["finding_count"], 1)
        self.assertFalse(summary["expired"])
        self.assertTrue(summary["reports"])
        self.assertTrue(notifications)

    def test_health_context_uses_semantic_biomarker_selection(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            settings = temp_settings(root)
            reports = [
                trend_report("01-01-2026", 1.2, 14.0),
                trend_report("01-03-2026", 2.4, 13.5),
                trend_report("01-05-2026", 3.8, 12.2, "HIGH"),
            ]
            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                for index, payload in enumerate(reports, start=1):
                    output_path = root / f"report-{index}.json"
                    output_path.write_text(json.dumps(payload), encoding="utf-8")
                    store.save_report(payload, f"report-{index}.json", output_path, settings)
                context = store.health_context_for_query(
                    "has tsh changed",
                    "trend_question",
                    "local-user",
                    settings,
                )
        self.assertIn("tsh", context)
        self.assertIn("Health score", context)

    def test_cli_import_json_uses_local_database(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            json_path = root / "report.json"
            json_path.write_text(json.dumps(sample_report()), encoding="utf-8")
            previous = dict(os.environ)
            os.environ["VAIDY_AGENT_DATABASE_PATH"] = str(root / "agent.db")
            os.environ["VAIDY_AGENT_REPORTS_DIR"] = str(root / "reports")
            os.environ["VAIDY_AGENT_INPUT_DIR"] = str(root / "input")
            os.environ["VAIDY_AGENT_OUTPUT_DIR"] = str(root / "output")
            os.environ["VAIDY_EMBEDDINGS_LOCAL_PRIMARY"] = "false"
            os.environ["VAIDY_EMBEDDING_DIM"] = "8"
            try:
                self.assertEqual(cli.main(["import-json", str(json_path)]), 0)
                self.assertEqual(cli.main(["search", "triglycerides"]), 0)
                self.assertTrue((root / "agent.db").exists())
            finally:
                os.environ.clear()
                os.environ.update(previous)

    def test_process_input_folder_imports_json_and_text_documents(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            settings = temp_settings(root)
            settings.input_dir.mkdir()
            json_path = settings.input_dir / "report.json"
            note_path = settings.input_dir / "notes.md"
            json_path.write_text(json.dumps(sample_report()), encoding="utf-8")
            note_path.write_text("Doctor note\nRetest triglycerides after diet changes.", encoding="utf-8")
            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                from healthcare_agent.ingest import process_input_folder

                summary = process_input_folder(settings, local_only=True)
                reports = store.list_reports(settings)
                answer = store.answer_question("diet changes", settings=settings)
        self.assertEqual(len(summary.processed), 2)
        self.assertEqual(len(reports), 2)
        self.assertIn("diet changes", answer)

    def test_cli_without_command_opens_agent_shell(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            previous = dict(os.environ)
            os.environ["VAIDY_AGENT_DATABASE_PATH"] = str(root / "agent.db")
            os.environ["VAIDY_AGENT_REPORTS_DIR"] = str(root / "reports")
            os.environ["VAIDY_AGENT_INPUT_DIR"] = str(root / "input")
            os.environ["VAIDY_AGENT_OUTPUT_DIR"] = str(root / "output")
            os.environ["VAIDY_EMBEDDINGS_LOCAL_PRIMARY"] = "false"
            os.environ["VAIDY_EMBEDDING_DIM"] = "8"
            try:
                with patch("builtins.input", side_effect=["status", "exit"]):
                    self.assertEqual(cli.main([]), 0)
                self.assertTrue((root / "input").exists())
                self.assertTrue((root / "output").exists())
            finally:
                os.environ.clear()
                os.environ.update(previous)

    def test_shell_chat_uses_model_for_casual_message(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        history = []
        commands = cli.load_agent_commands()
        with patch("healthcare_agent.cli.chat_response") as chat:
            chat.return_value.text = "Hi, I am here."
            self.assertEqual(cli.handle_agent_message("hi", settings, commands, history), "handled")
        self.assertEqual(chat.call_args.args[0], "hi")
        self.assertIn("on_chunk", chat.call_args.kwargs)
        self.assertEqual(history[-1]["content"], "Hi, I am here.")

    def test_ask_command_forces_report_context_chat(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        history = []
        commands = cli.load_agent_commands()
        with patch("healthcare_agent.cli.chat_response") as chat:
            chat.return_value.text = "The report shows pending items."
            self.assertEqual(cli.handle_agent_message("/ask what is pending", settings, commands, history), "handled")
        self.assertTrue(chat.call_args.kwargs["force_report_context"])

    def test_print_chat_response_streams_chunks(self):
        with patch("healthcare_agent.cli.chat_response") as chat:
            def fake_response(_message, on_chunk=None, **_kwargs):
                if on_chunk:
                    on_chunk("Hel")
                    on_chunk("lo")
                from healthcare_agent.chat import ChatResult

                return ChatResult("Hello", False, "test", [])

            chat.side_effect = fake_response
            result = cli.print_chat_response("hi")
        self.assertEqual(result.text, "Hello")

    def test_casual_chat_selects_fast_lane_model(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        from healthcare_agent.chat import select_chat_model

        self.assertEqual(select_chat_model(settings, use_report_context=False), settings.chat_fast_model)
        self.assertEqual(select_chat_model(settings, use_report_context=True), settings.chat_report_model)

    def test_chat_warmup_uses_fast_model(self):
        settings = temp_settings(Path(tempfile.mkdtemp()))
        warm_settings = settings.__class__(**{**settings.__dict__, "nvidia_api_key": "key"})
        with patch("healthcare_agent.chat.call_chat_model") as call:
            from healthcare_agent.chat import warm_chat_model

            warm_chat_model(warm_settings)
        self.assertEqual(call.call_args.kwargs["model"], settings.chat_fast_model)

    def test_memory_persists_session_messages_and_recall(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            with patch("healthcare_agent.memory.embed_texts", side_effect=fake_embeddings):
                session_id = memory.ensure_session(settings=settings)
                saved = memory.remember_turn(
                    session_id,
                    "Remember I prefer concise report summaries.",
                    "I will keep report summaries concise.",
                    settings,
                )
                messages = memory.recent_session_messages(session_id, settings=settings)
                hits = memory.recall_memories("concise summaries", session_id=session_id, settings=settings)
                assessment = memory.memory_assessment(settings)
        self.assertEqual(saved["session_id"], session_id)
        self.assertEqual(len(messages), 2)
        self.assertIn("concise", hits[0].text.casefold())
        self.assertEqual(assessment["sessions"], 1)
        self.assertEqual(assessment["messages"], 2)
        self.assertEqual(assessment["entries"], 1)

    def test_chat_response_injects_memory_and_saves_turn(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            captured: dict[str, str] = {}

            def fake_call(messages, _settings, on_chunk=None, model=None):
                captured["system"] = messages[0]["content"]
                if on_chunk:
                    on_chunk("You prefer concise.")
                return "You prefer concise.", "test-model"

            with patch("healthcare_agent.memory.embed_texts", side_effect=fake_embeddings):
                session_id = memory.ensure_session(settings=settings)
                memory.remember_text(
                    "User prefers concise report summaries.",
                    session_id=session_id,
                    settings=settings,
                )
                with patch("healthcare_agent.chat.should_use_report_context", return_value=False):
                    with patch("healthcare_agent.chat.call_chat_model", side_effect=fake_call):
                        result = chat.chat_response(
                            "What summary style do I prefer?",
                            settings=settings,
                            session_id=session_id,
                        )
                messages = memory.recent_session_messages(session_id, settings=settings)
        self.assertEqual(result.session_id, session_id)
        self.assertIn("Persistent memory", captured["system"])
        self.assertIn("concise", captured["system"].casefold())
        self.assertEqual(messages[-1]["role"], "assistant")
        self.assertIn("concise", messages[-1]["content"])

    def test_chat_response_uses_memory_when_model_is_unavailable(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            with patch("healthcare_agent.memory.embed_texts", side_effect=fake_embeddings):
                session_id = memory.ensure_session(settings=settings)
                memory.remember_text(
                    "User wants Vaidy to preserve session context across messages.",
                    session_id=session_id,
                    settings=settings,
                )
                with patch("healthcare_agent.chat.should_use_report_context", return_value=False):
                    with patch("healthcare_agent.chat.call_chat_model", return_value=("NVIDIA chat failed", "unavailable")):
                        result = chat.chat_response(
                            "What should you preserve?",
                            settings=settings,
                            session_id=session_id,
                        )
        self.assertIn("saved memory", result.text)
        self.assertIn("preserve session context", result.text)
        self.assertEqual(result.model, "unavailable")

    def test_fresh_upload_forces_report_context_for_vague_message(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            output_path = Path(temp_dir) / "report.json"
            output_path.write_text(json.dumps(sample_report()), encoding="utf-8")
            captured: dict[str, str] = {}

            def fake_call(messages, _settings, on_chunk=None, model=None):
                captured["system"] = messages[0]["content"]
                return "Here is your report breakdown.", "test-model"

            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                with patch("healthcare_agent.memory.embed_texts", side_effect=fake_embeddings):
                    report_id = store.save_report(sample_report(), "report.pdf", output_path, settings)
                    session_id = memory.ensure_session(settings=settings)
                    memory.bind_session_to_report(session_id, report_id, settings)
                    # Without the fresh upload, a vague "analyze this" would be casual.
                    with patch("healthcare_agent.chat.should_use_report_context", return_value=False):
                        with patch("healthcare_agent.chat.call_chat_model", side_effect=fake_call):
                            result = chat.chat_response(
                                "analyze this",
                                settings=settings,
                                session_id=session_id,
                            )
        self.assertTrue(result.used_report_context)
        self.assertEqual(result.retrieval_intent, "fresh_upload")
        self.assertIn("Fresh upload metadata", captured["system"])
        self.assertIn("triglycerides", captured["system"].casefold())

    def test_fresh_upload_window_expires(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = temp_settings(Path(temp_dir))
            output_path = Path(temp_dir) / "report.json"
            output_path.write_text(json.dumps(sample_report()), encoding="utf-8")
            with patch("healthcare_agent.store.embed_texts", side_effect=fake_embeddings):
                with patch("healthcare_agent.memory.embed_texts", side_effect=fake_embeddings):
                    report_id = store.save_report(sample_report(), "report.pdf", output_path, settings)
                    session_id = memory.ensure_session(settings=settings)
                    memory.bind_session_to_report(session_id, report_id, settings)
                    fresh = memory.fresh_session_report(session_id, settings)
                    self.assertIsNotNone(fresh)
                    memory.clear_session_report(session_id, settings)
                    cleared = memory.fresh_session_report(session_id, settings)
        self.assertIsNone(cleared)


if __name__ == "__main__":
    unittest.main()
