from backend.app.rules import evaluate_signals
from backend.app.schemas import ScanSignals
from backend.app.scoring import calculate_score, classify_score


def signals(**overrides) -> ScanSignals:
    values = {
        "protocol": "https:",
        "host": "library.example",
        "credential_form_count": 1,
        "payment_field_count": 0,
        "cross_domain_credential_hosts": [],
        "external_link_count": 4,
        "external_resource_hosts": ["static-cdn.example"],
        "redirect_count": 0,
        "has_url_credentials": False,
        "is_ip_address": False,
        "is_punycode": False,
    }
    return ScanSignals(**(values | overrides))


def test_ordinary_form_and_external_hosts_are_low_risk():
    evidence = evaluate_signals(signals())
    score = calculate_score(evidence)
    assert evidence == []
    assert score == 8
    assert classify_score(score) == "low"


def test_numeric_host_is_medium_risk():
    score = calculate_score(evaluate_signals(signals(is_ip_address=True)))
    assert score == 48
    assert classify_score(score) == "medium"


def test_cross_domain_credentials_and_http_sensitive_form_are_high_risk():
    evidence = evaluate_signals(
        signals(
            protocol="http:",
            cross_domain_credential_hosts=["login-desk.example"],
        )
    )
    score = calculate_score(evidence)
    assert [item.id for item in evidence] == ["cross-domain-credential", "http-sensitive-form"]
    assert score == 100
    assert classify_score(score) == "high"
