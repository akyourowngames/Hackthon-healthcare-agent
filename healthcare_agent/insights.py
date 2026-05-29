from __future__ import annotations

import math
from dataclasses import dataclass
from statistics import mean, pstdev
from typing import Any


@dataclass(frozen=True)
class InsightPolicy:
    trend_min_points: int
    baseline_min_points: int
    baseline_zscore: float
    baseline_min_relative_change: float
    urgent_zscore: float
    health_score_abnormal_penalty: int
    health_score_watch_penalty: int
    health_score_concern_penalty: int
    health_score_urgent_penalty: int


def policy_from_settings(settings) -> InsightPolicy:
    return InsightPolicy(
        trend_min_points=int(settings.trend_min_points),
        baseline_min_points=int(settings.baseline_min_points),
        baseline_zscore=float(settings.baseline_zscore),
        baseline_min_relative_change=float(settings.baseline_min_relative_change),
        urgent_zscore=float(settings.urgent_zscore),
        health_score_abnormal_penalty=int(settings.health_score_abnormal_penalty),
        health_score_watch_penalty=int(settings.health_score_watch_penalty),
        health_score_concern_penalty=int(settings.health_score_concern_penalty),
        health_score_urgent_penalty=int(settings.health_score_urgent_penalty),
    )


def compute_anomaly_findings(rows: list[dict[str, Any]], policy: InsightPolicy) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        name = str(row.get("biomarker_name") or "").strip()
        value = row.get("value")
        if not name or value is None:
            continue
        grouped.setdefault(name, []).append(row)

    findings: list[dict[str, Any]] = []
    for biomarker, biomarker_rows in grouped.items():
        ordered = sorted(biomarker_rows, key=_row_order_key)
        findings.extend(_trend_findings(biomarker, ordered, policy))
        findings.extend(_baseline_findings(biomarker, ordered, policy))
        findings.extend(_first_abnormal_findings(biomarker, ordered))

    findings.sort(key=lambda item: (_severity_rank(item.get("severity")), str(item.get("biomarker"))))
    return findings


def compute_health_score(history_rows: list[dict[str, Any]], findings: list[dict[str, Any]], policy: InsightPolicy) -> dict[str, Any]:
    latest_by_biomarker: dict[str, dict[str, Any]] = {}
    for row in history_rows:
        name = str(row.get("biomarker_name") or "")
        if not name:
            continue
        previous = latest_by_biomarker.get(name)
        if previous is None or _row_order_key(row) > _row_order_key(previous):
            latest_by_biomarker[name] = row

    abnormal_count = 0
    for row in latest_by_biomarker.values():
        flag = str(row.get("flag") or "").upper()
        if flag in {"HIGH", "LOW"}:
            abnormal_count += 1

    score = 100 - abnormal_count * policy.health_score_abnormal_penalty
    strongest_by_biomarker: dict[str, str] = {}
    for finding in findings:
        biomarker = str(finding.get("biomarker") or "")
        severity = str(finding.get("severity") or "")
        previous = strongest_by_biomarker.get(biomarker)
        if previous is None or _severity_rank(severity) < _severity_rank(previous):
            strongest_by_biomarker[biomarker] = severity

    for severity in strongest_by_biomarker.values():
        if severity == "urgent":
            score -= policy.health_score_urgent_penalty
        elif severity == "concern":
            score -= policy.health_score_concern_penalty
        elif severity == "watch":
            score -= policy.health_score_watch_penalty

    return {
        "score": max(0, min(100, int(round(score)))),
        "latest_biomarkers": len(latest_by_biomarker),
        "abnormal_latest": abnormal_count,
        "finding_count": len(findings),
    }


def compact_history_context(rows: list[dict[str, Any]], findings: list[dict[str, Any]], score: dict[str, Any]) -> str:
    lines: list[str] = []
    if score:
        lines.append(
            "Health score: "
            f"{score.get('score', 0)}/100; "
            f"{score.get('abnormal_latest', 0)} abnormal latest readings; "
            f"{score.get('finding_count', 0)} active findings."
        )
    if findings:
        lines.append("Current anomaly findings:")
        for finding in findings[:6]:
            lines.append(
                "- "
                + str(finding.get("severity") or "watch")
                + " "
                + str(finding.get("finding_type") or "finding")
                + " for "
                + str(finding.get("biomarker") or "unknown")
                + ": "
                + str(finding.get("description") or "").strip()
            )
    if rows:
        lines.append("Biomarker history:")
        for row in rows[:18]:
            parts = [
                str(row.get("biomarker_name") or "unknown"),
                str(row.get("value") if row.get("value") is not None else ""),
                str(row.get("unit") or ""),
            ]
            detail = " ".join(part for part in parts if part).strip()
            suffix_parts = []
            if row.get("flag"):
                suffix_parts.append("flag " + str(row.get("flag")))
            if row.get("report_date"):
                suffix_parts.append("date " + str(row.get("report_date")))
            if row.get("lab_name"):
                suffix_parts.append("lab " + str(row.get("lab_name")))
            suffix = "; ".join(suffix_parts)
            lines.append("- " + detail + (f"; {suffix}" if suffix else ""))
    return "\n".join(lines).strip()


def _trend_findings(biomarker: str, rows: list[dict[str, Any]], policy: InsightPolicy) -> list[dict[str, Any]]:
    if len(rows) < policy.trend_min_points:
        return []
    tail = rows[-policy.trend_min_points :]
    values = [_float_value(row.get("value")) for row in tail]
    if any(value is None for value in values):
        return []
    numeric_values = [float(value) for value in values if value is not None]
    deltas = [numeric_values[index + 1] - numeric_values[index] for index in range(len(numeric_values) - 1)]
    non_zero = [delta for delta in deltas if delta != 0]
    if len(non_zero) != len(deltas):
        return []
    direction = "up" if all(delta > 0 for delta in non_zero) else "down" if all(delta < 0 for delta in non_zero) else ""
    if not direction:
        return []
    slope = (numeric_values[-1] - numeric_values[0]) / max(1, len(numeric_values) - 1)
    severity = "concern" if _latest_abnormal(rows) else "watch"
    return [
        {
            "biomarker": biomarker,
            "finding_type": "trend",
            "severity": severity,
            "description": f"{biomarker} is moving {direction} across {len(tail)} reports.",
            "data_points": _data_points(tail),
            "metrics": {
                "direction": direction,
                "slope": round(float(slope), 4),
            },
        }
    ]


def _baseline_findings(biomarker: str, rows: list[dict[str, Any]], policy: InsightPolicy) -> list[dict[str, Any]]:
    if len(rows) < policy.baseline_min_points:
        return []
    latest = rows[-1]
    latest_value = _float_value(latest.get("value"))
    previous_values = [_float_value(row.get("value")) for row in rows[:-1]]
    if latest_value is None or any(value is None for value in previous_values):
        return []
    values = [float(value) for value in previous_values if value is not None]
    if len(values) < max(1, policy.baseline_min_points - 1):
        return []
    personal_mean = mean(values)
    standard_deviation = pstdev(values) if len(values) > 1 else 0.0
    delta = float(latest_value) - personal_mean
    if standard_deviation > 0:
        zscore = abs(delta) / standard_deviation
        breached = zscore >= policy.baseline_zscore
    else:
        relative = abs(delta) / max(abs(personal_mean), 1.0)
        zscore = math.inf if relative >= policy.baseline_min_relative_change else 0.0
        breached = relative >= policy.baseline_min_relative_change
    if not breached:
        return []
    severity = "urgent" if zscore >= policy.urgent_zscore or _latest_abnormal(rows) else "concern"
    readable_zscore = "stable-baseline breach" if math.isinf(zscore) else f"{zscore:.1f} standard deviations"
    return [
        {
            "biomarker": biomarker,
            "finding_type": "baseline_breach",
            "severity": severity,
            "description": f"{biomarker} is {readable_zscore} from this user's prior baseline.",
            "data_points": _data_points(rows),
            "metrics": {
                "personal_mean": round(float(personal_mean), 4),
                "standard_deviation": round(float(standard_deviation), 4),
                "current_deviation": round(float(delta), 4),
                "zscore": None if math.isinf(zscore) else round(float(zscore), 4),
            },
        }
    ]


def _first_abnormal_findings(biomarker: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    latest = rows[-1]
    latest_flag = str(latest.get("flag") or "").upper()
    if latest_flag not in {"HIGH", "LOW"}:
        return []
    previous_abnormal = any(str(row.get("flag") or "").upper() in {"HIGH", "LOW"} for row in rows[:-1])
    if previous_abnormal:
        return []
    return [
        {
            "biomarker": biomarker,
            "finding_type": "first_abnormal",
            "severity": "concern",
            "description": f"{biomarker} is {latest_flag} for the first time in stored history.",
            "data_points": _data_points(rows),
            "metrics": {"flag": latest_flag},
        }
    ]


def _data_points(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    for row in rows:
        points.append(
            {
                "report_id": row.get("report_id"),
                "value": row.get("value"),
                "unit": row.get("unit"),
                "flag": row.get("flag"),
                "report_date": row.get("report_date"),
                "lab_name": row.get("lab_name"),
            }
        )
    return points


def _float_value(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _latest_abnormal(rows: list[dict[str, Any]]) -> bool:
    if not rows:
        return False
    return str(rows[-1].get("flag") or "").upper() in {"HIGH", "LOW"}


def _row_order_key(row: dict[str, Any]) -> tuple[int, str, int]:
    return (
        int(row.get("report_id") or 0),
        str(row.get("report_date") or ""),
        int(row.get("id") or 0),
    )


def _severity_rank(value: object) -> int:
    severity = str(value or "")
    if severity == "urgent":
        return 0
    if severity == "concern":
        return 1
    return 2
