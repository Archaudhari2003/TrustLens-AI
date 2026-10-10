from .schemas import RiskIndicator, RiskLevel

BASELINE_RISK_SCORE = 8
MEDIUM_RISK_THRESHOLD = 30
HIGH_RISK_THRESHOLD = 65


def calculate_score(evidence: list[RiskIndicator]) -> int:
    return min(100, BASELINE_RISK_SCORE + sum(item.contribution for item in evidence))


def classify_score(score: int) -> RiskLevel:
    if score >= HIGH_RISK_THRESHOLD:
        return "high"
    if score >= MEDIUM_RISK_THRESHOLD:
        return "medium"
    return "low"
