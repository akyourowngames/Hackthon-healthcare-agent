from __future__ import annotations

import unittest

from extractor.normalizer import load_aliases, merge_reports, normalize_name, normalize_report, to_float


class NormalizerTests(unittest.TestCase):
    def test_aliases_normalize_common_names(self):
        aliases = load_aliases()
        self.assertEqual(normalize_name("Hb", aliases), "hemoglobin")
        self.assertEqual(normalize_name("Total Leukocyte Count", aliases), "wbc")
        self.assertEqual(normalize_name("SGPT", aliases), "alt")

    def test_report_normalization_merges_duplicate_aliases(self):
        report = normalize_report(
            {
                "patient_name": "Asha",
                "report_date": "2026-05-27",
                "lab_name": "City Lab",
                "biomarkers": {
                    "Hb": {"value": "11.2", "unit": "g/dL", "ref_range": "13-17"},
                    "Haemoglobin": {"flag": "low"},
                },
            }
        )
        self.assertEqual(report["biomarkers"]["hemoglobin"]["value"], 11.2)
        self.assertEqual(report["biomarkers"]["hemoglobin"]["flag"], "LOW")

    def test_numeric_cleanup(self):
        self.assertEqual(to_float("4,500 cells/uL"), 4500.0)
        self.assertEqual(to_float("11.2 g/dL"), 11.2)
        self.assertIsNone(to_float("not available"))

    def test_merge_keeps_primary_values_and_fills_missing_fields(self):
        merged = merge_reports(
            {"patient_name": "Asha", "biomarkers": {"Hb": {"value": 11.2}}},
            {"report_date": "2026-05-27", "biomarkers": {"HGB": {"unit": "g/dL"}}},
        )
        self.assertEqual(merged["patient_name"], "Asha")
        self.assertEqual(merged["report_date"], "2026-05-27")
        self.assertEqual(merged["biomarkers"]["hemoglobin"]["value"], 11.2)
        self.assertEqual(merged["biomarkers"]["hemoglobin"]["unit"], "g/dL")

    def test_empty_biomarker_is_dropped(self):
        report = normalize_report(
            {
                "biomarkers": {
                    "Panel Name": {},
                    "Hb": {"value": "11.2", "unit": "g/dL"},
                }
            }
        )
        self.assertNotIn("panel_name", report["biomarkers"])
        self.assertIn("hemoglobin", report["biomarkers"])

    def test_pending_biomarker_is_preserved(self):
        report = normalize_report(
            {
                "report_status": "interim",
                "biomarkers": {
                    "HbA1c": {"value": None, "unit": "%", "flag": "pending"},
                },
            }
        )
        self.assertEqual(report["report_status"], "interim")
        self.assertEqual(report["biomarkers"]["hba1c"]["flag"], "PENDING")
        self.assertIsNone(report["biomarkers"]["hba1c"]["value"])

    def test_biomarker_flag_is_not_report_status(self):
        report = normalize_report(
            {
                "report_status": "NORMAL",
                "biomarkers": {
                    "Hb": {"value": 11.2, "unit": "g/dL", "flag": "NORMAL"},
                },
            }
        )
        self.assertIsNone(report["report_status"])
        self.assertEqual(report["biomarkers"]["hemoglobin"]["flag"], "NORMAL")


if __name__ == "__main__":
    unittest.main()
