from datetime import datetime, timezone

from .rules import different_credential_hosts, evaluate_signals
from .schemas import PageObservation, ScanResult, ScanSignals
from .scoring import calculate_score, classify_score


def analyze(signals: ScanSignals) -> ScanResult:
    evidence = evaluate_signals(signals)
    credential_destinations = different_credential_hosts(signals)
    score = calculate_score(evidence)
    classification = classify_score(score)
    summary, recommendation = {
        "low": (
            "No strong risk indicators were found in the checks available to this rule-based assessment.",
            "Continue to check the address before sharing sensitive information. A low score is not a guarantee of safety.",
        ),
        "medium": (
            "One or more signals merit a closer look before you continue.",
            "Check the full address and verify the site through a trusted bookmark or official app.",
        ),
        "high": (
            "Strong risk indicators were found in observable page metadata.",
            "Avoid entering passwords or payment details until you verify the address through a trusted channel.",
        ),
    }[classification]
    observations = [
        PageObservation(
            id="url-features",
            label="URL and hostname features",
            value=" · ".join(
                marker
                for marker, present in (
                    ("Numeric host", signals.is_ip_address),
                    ("Internationalized hostname", signals.is_punycode),
                    ("Embedded URL credentials", signals.has_url_credentials),
                )
                if present
            )
            or "No standout structure observed",
            state="observed",
            detail="Only address structure was checked. The URL path and query are not retained, and this does not check reputation or ownership.",
        ),
        PageObservation(
            id="transport",
            label="Transport security",
            value="HTTPS" if signals.protocol == "https:" else "HTTP",
            state="observed",
            detail=(
                "The page was served over HTTPS. This does not verify the site's identity "
                "or certificate chain."
                if signals.protocol == "https:"
                else "The page was served over plain HTTP. Certificate-chain details are not applicable."
            ),
        ),
        PageObservation(
            id="site-identity",
            label="Site ownership and reputation",
            value="Not verified",
            state="unverified",
            detail="No ownership or reputation lookup was performed. HTTPS encrypts transport but does not prove that a site is legitimate.",
        ),
        PageObservation(
            id="certificate-chain",
            label="Certificate chain",
            value="Not inspected",
            state="not-checked",
            detail="This scanner does not inspect certificate-chain details.",
        ),
        PageObservation(
            id="credentials",
            label="Sensitive fields",
            value=(
                f"{signals.credential_form_count} password form(s) · "
                f"{signals.payment_field_count} payment field(s)"
            ),
            state="observed",
            detail="Only field types and autocomplete metadata were counted. Values and private form contents were not read.",
        ),
        PageObservation(
            id="form-destination",
            label="Cross-domain credential forms",
            value=(
                ", ".join(credential_destinations)
                if credential_destinations
                else "None observed"
                if signals.credential_form_count
                else "No password form found"
            ),
            state="observed" if signals.credential_form_count else "not-observed",
            detail="A same-domain form is not inherently safe; this check only reports whether its destination hostname differs.",
        ),
        PageObservation(
            id="external-links",
            label="External links",
            value=f"{signals.external_link_count} external links",
            state="observed",
            detail="External links are common and are not considered malicious on their own.",
        ),
        PageObservation(
            id="external-resources",
            label="External resources",
            value=f"{len(signals.external_resource_hosts)} host(s)",
            state="observed",
            detail=(
                f"Observed resource hosts: {', '.join(signals.external_resource_hosts)}."
                if signals.external_resource_hosts
                else "No external resource hosts were observed."
            ),
        ),
        PageObservation(
            id="redirects",
            label="Navigation redirect timing",
            value="Unavailable" if signals.redirect_count is None else f"{signals.redirect_count} reported",
            state="unavailable",
            detail="Browser timing data may omit cross-origin redirects and cannot establish the complete network redirect chain.",
        ),
    ]
    return ScanResult(
        host=signals.host,
        scanned_at=datetime.now(timezone.utc).isoformat(),
        score=score,
        classification=classification,
        summary=summary,
        recommendation=recommendation,
        evidence=evidence,
        observations=observations,
    )
