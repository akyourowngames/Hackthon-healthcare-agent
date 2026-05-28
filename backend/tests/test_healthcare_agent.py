from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

from healthcare_agent import cli, embedder, store
from healthcare_agent.config import AgentSettings
from healthcare_agent.embedder import EmbeddingResult


def temp_settings(root: Path) -> AgentSettings:
    return AgentSettings(
        database_path=root / "health_agent.db",
        reports_dir=root / "reports",
        input_dir=root / "input",
        default_output_dir=root / "output",
        supported_extensions=(".pdf", ".json", ".txt", ".md"),
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


def fake_embeddings(texts, settings=None):
    batch = [texts] if isinstance(texts, str) else list(texts)
    vectors = []
    for text in batch:
        vector = np.zeros(8, dtype=np.float32)
        if "triglycerides" in str(text).casefold():
            vector[0] = 1.0
        elif "hemoglobin" in str(text).casefold():
            vector[1] = 1.0
        else:
            vector[2] = 1.0
        vectors.append(vector)
    matrix = np.vstack(vectors)
    if isinstance(texts, str):
        return EmbeddingResult(matrix[0], "test")
    return EmbeddingResult(matrix, "test")


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


if __name__ == "__main__":
    unittest.main()
