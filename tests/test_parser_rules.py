from __future__ import annotations

import unittest

from extractor.main import merge_text_preferred
from extractor.parser_rules import parse_text_report


class ParserRuleTests(unittest.TestCase):
    def test_parse_indian_lab_text(self):
        text = """
        Lab Name: City Diagnostics
        Patient Name: Asha Mehta
        Report Date: 27-05-2026
        Hb 11.2 g/dL 13-17 LOW
        TLC 7200 cells/uL 4000-11000 NORMAL
        SGPT 58 U/L 0-45 HIGH
        Total Cholesterol 182 mg/dL 125-200 NORMAL
        """
        report = parse_text_report(text)
        self.assertEqual(report["patient_name"], "Asha Mehta")
        self.assertEqual(report["lab_name"], "City Diagnostics")
        self.assertEqual(report["biomarkers"]["hemoglobin"]["value"], 11.2)
        self.assertEqual(report["biomarkers"]["hemoglobin"]["flag"], "LOW")
        self.assertEqual(report["biomarkers"]["wbc"]["value"], 7200.0)
        self.assertEqual(report["biomarkers"]["alt"]["flag"], "HIGH")
        self.assertEqual(report["biomarkers"]["total_cholesterol"]["unit"], "mg/dL")

    def test_parse_ocr_flattened_line(self):
        text = """
        ## City Diagnostics

        PatientName:AshaMehta Report Date: 27-05-2026 Hb 11.2 g/dL 13-17 LOW TLC 7200cells/uL 4000-11000 NORMAL Platelet Count 245 10^3/uL 150-450 NORMAL SGPT 58 U/L 0-45 HIGH Total Cholesterol 182 mg/dL 125-200 NORMAL
        """
        report = parse_text_report(text)
        self.assertEqual(report["patient_name"], "AshaMehta")
        self.assertEqual(report["biomarkers"]["hemoglobin"]["value"], 11.2)
        self.assertEqual(report["biomarkers"]["wbc"]["value"], 7200.0)
        self.assertEqual(report["biomarkers"]["platelets"]["value"], 245.0)
        self.assertEqual(report["biomarkers"]["alt"]["value"], 58.0)
        self.assertEqual(report["biomarkers"]["total_cholesterol"]["value"], 182.0)

    def test_text_preferred_merge_does_not_fill_null_value_from_partial_image(self):
        image_payload = {
            "biomarkers": {
                "HbA1c": {"value": 1.0, "unit": "%", "ref_range": "4.00 - 5.60"}
            }
        }
        text_payload = {
            "biomarkers": {
                "HbA1c": {"value": None, "unit": "%", "ref_range": "4.00 - 5.60"}
            }
        }
        merged = merge_text_preferred(image_payload, text_payload)
        self.assertIsNone(merged["biomarkers"]["hba1c"]["value"])
        self.assertEqual(merged["biomarkers"]["hba1c"]["unit"], "%")

    def test_parse_report_status_from_markdown_metadata_fields(self):
        text = """
        Lab Name: City Diagnostics
        Patient Name: Asha Mehta
        Report Status: Interim
        Hb 11.2 g/dL 13-17 LOW
        """
        report = parse_text_report(text)
        self.assertEqual(report["report_status"], "interim")
        self.assertEqual(report["biomarkers"]["hemoglobin"]["value"], 11.2)


if __name__ == "__main__":
    unittest.main()
