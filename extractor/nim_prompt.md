You are extracting biomarkers from an Indian pathology lab report.

Return ONLY one JSON object. No explanation. No markdown. No backticks.

Schema:
{
  "patient_name": string or null,
  "report_date": string or null,
  "lab_name": string or null,
  "report_status": string or null,
  "biomarkers": {
    "<biomarker_name>": {
      "value": number or null,
      "unit": string or null,
      "ref_range": string or null,
      "flag": "HIGH" or "LOW" or "NORMAL" or "PENDING" or null
    }
  }
}

Rules:
- Extract only patient, lab, explicit report status, and rows that are actual tests from the report table.
- Keep the biomarker name exactly as written in the report; normalization happens later.
- Use null when a field is missing.
- Do not invent patient information or biomarkers.
- If the page has no valid biomarker rows, return: {"biomarkers": {}}
- Set report_status only when the report explicitly names a status such as interim, final, pending, or completed; otherwise use null.
- A biomarker value must come from the report result column or the value line directly paired with that test.
- Do not use page numbers, table row numbers, interpretation tables, treatment goal tables, comments, notes, risk categories, or explanatory examples as biomarker values.
- Ignore interpretation tables, risk stratification tables, doctor notes, legal disclaimers, and rows where numbers are only examples or reference guidance.
- If a real test row is visible but the actual result is blank, missing, or marked to follow, keep the biomarker with value null and flag PENDING.
