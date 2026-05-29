You are reading a single medical image. It may be a photograph of a printed lab
report page, a scanned page, an X-ray, a CT slice, an MRI slice, an ultrasound
still, a prescription, or another medical document.

Return ONLY one JSON object. No explanation. No markdown. No backticks.

Schema:
{
  "patient_name": string or null,
  "report_date": string or null,
  "lab_name": string or null,
  "report_status": string or null,
  "modality": string or null,
  "body_region": string or null,
  "summary": string or null,
  "findings": [
    {
      "title": string,
      "detail": string,
      "severity": "normal" or "watch" or "concern" or "urgent" or null
    }
  ],
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
- If the image is a lab report or has a numeric results table, fill biomarkers
  using values that come from the report itself. Use null when a field is
  missing.
- If the image is a radiology study or any non-tabular medical image, leave
  biomarkers as {} and describe what is visible in findings. Each finding has a
  short title and a detail string in plain language.
- modality is the imaging type when known (chest x-ray, ct abdomen, mri brain,
  ultrasound, ecg, prescription, lab report, document). Use null when unsure.
- body_region is the anatomy in the image when known (chest, abdomen, brain,
  pelvis, knee, full body, hand). Use null when unsure.
- summary is one sentence in plain English describing the most important
  observation.
- Never invent patient identifiers. Never invent biomarker values. Never invent
  findings. If the image is unreadable, return findings: [{"title": "image
  unreadable", "detail": "...", "severity": "watch"}] with empty biomarkers.
- Severity is your best estimate based only on what you see. Default to null
  when unsure. Mark severity urgent only for things like obvious hemorrhage,
  pneumothorax, fracture displacement, large mass, or critical lab values.
- Do not write a diagnosis. Describe what is visible and keep clinical
  interpretation tentative.
