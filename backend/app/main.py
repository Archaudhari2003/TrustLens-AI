from fastapi import FastAPI

from .analyzer import analyze
from .schemas import ScanResult, ScanSignals

app = FastAPI(
    title="TrustLens AI Analysis API",
    description=(
        "Rule-based analysis of page metadata explicitly submitted by a client. "
        "This API does not fetch target websites or accept page/form contents."
    ),
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "metadata-only-rule-based"}


@app.post("/analyze", response_model=ScanResult)
def analyze_page(signals: ScanSignals) -> ScanResult:
    return analyze(signals)
