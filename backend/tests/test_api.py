from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

SAFE_SIGNALS = {
    "protocol": "https:",
    "host": "library.example",
    "credential_form_count": 1,
    "payment_field_count": 0,
    "cross_domain_credential_hosts": [],
    "external_link_count": 3,
    "external_resource_hosts": ["static-cdn.example"],
    "redirect_count": None,
    "has_url_credentials": False,
    "is_ip_address": False,
    "is_punycode": False,
}


def test_health_reports_metadata_only_mode():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["mode"] == "metadata-only-rule-based"


def test_analyze_returns_low_risk_for_ordinary_form_and_external_resource():
    response = client.post("/analyze", json=SAFE_SIGNALS)
    assert response.status_code == 200
    result = response.json()
    assert result["classification"] == "low"
    assert result["score"] == 8
    assert result["source"] == "remote"
    assert "scannedAt" in result
    assert result["observations"][0]["id"] == "url-features"
    assert result["observations"][2]["state"] == "unverified"
    assert result["observations"][3]["state"] == "not-checked"
    assert result["observations"][-1]["state"] == "unavailable"


def test_api_accepts_frontend_camel_case_signal_schema():
    signals = {
        "protocol": "https:",
        "host": "library.example",
        "credentialFormCount": 1,
        "paymentFieldCount": 0,
        "crossDomainCredentialHosts": [],
        "externalLinkCount": 3,
        "externalResourceHosts": [],
        "redirectCount": None,
        "hasUrlCredentials": False,
        "isIpAddress": False,
        "isPunycode": False,
    }
    response = client.post("/analyze", json=signals)
    assert response.status_code == 200
    assert response.json()["classification"] == "low"


def test_analyze_reports_cross_domain_credential_destination():
    signals = SAFE_SIGNALS | {
        "cross_domain_credential_hosts": ["login-desk.example"],
    }
    response = client.post("/analyze", json=signals)
    assert response.status_code == 200
    assert response.json()["classification"] == "high"
    assert response.json()["evidence"][0]["id"] == "cross-domain-credential"


def test_destination_mismatch_without_a_password_form_is_not_high_risk():
    signals = SAFE_SIGNALS | {
        "credential_form_count": 0,
        "cross_domain_credential_hosts": ["login-desk.example"],
    }
    response = client.post("/analyze", json=signals)
    assert response.status_code == 200
    assert response.json()["classification"] == "low"


def test_same_domain_form_destination_is_not_reported_as_cross_domain():
    signals = SAFE_SIGNALS | {
        "cross_domain_credential_hosts": ["LIBRARY.EXAMPLE."],
    }
    response = client.post("/analyze", json=signals)
    assert response.status_code == 200
    result = response.json()
    assert result["classification"] == "low"
    assert result["observations"][5]["value"] == "None observed"


def test_api_rejects_urls_and_unmodeled_private_page_content():
    response = client.post(
        "/analyze",
        json=SAFE_SIGNALS | {"host": "https://library.example/login", "password": "do-not-accept"},
    )
    assert response.status_code == 422


def test_api_rejects_non_string_hosts_without_server_error():
    response = client.post(
        "/analyze",
        json=SAFE_SIGNALS | {"external_resource_hosts": [123]},
    )
    assert response.status_code == 422
