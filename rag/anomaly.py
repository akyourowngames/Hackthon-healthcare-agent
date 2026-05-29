from __future__ import annotations

from healthcare_agent.store import dashboard_snapshot, list_anomaly_findings


def analyze_trends(user_id: str) -> list[dict]:
    snapshot = dashboard_snapshot(user_id)
    findings = snapshot.get("anomalies") or list_anomaly_findings(user_id)
    return [dict(item) for item in findings]
