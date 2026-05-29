from __future__ import annotations

import unittest

from extractor.schema import report_to_dict, validate_report


class SchemaTests(unittest.TestCase):
    def test_validate_expected_report(self):
        report = validate_report(
            {
                "patient_name": "Asha Mehta",
                "report_date": "27-05-2026",
                "lab_name": "City Diagnostics",
                "biomarkers": {
                    "hemoglobin": {
                        "value": "11.2",
                        "unit": "g/dL",
                        "ref_range": "13-17",
                    }
                },
            }
        )
        payload = report_to_dict(report)
        self.assertEqual(payload["biomarkers"]["hemoglobin"]["value"], 11.2)
        self.assertNotIn("flag", payload["biomarkers"]["hemoglobin"])

    def test_validate_interim_pending_report(self):
        report = validate_report(
            {
                "patient_name": "DUMMY",
                "report_status": "interim",
                "biomarkers": {
                    "hba1c": {
                        "value": None,
                        "unit": "%",
                        "ref_range": "4.00 - 5.60",
                        "flag": "PENDING",
                    }
                },
            }
        )
        payload = report_to_dict(report)
        self.assertEqual(payload["report_status"], "interim")
        self.assertEqual(payload["biomarkers"]["hba1c"]["flag"], "PENDING")
        self.assertNotIn("value", payload["biomarkers"]["hba1c"])


if __name__ == "__main__":
    unittest.main()
