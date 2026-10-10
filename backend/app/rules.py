from .schemas import RiskIndicator, ScanSignals


def different_credential_hosts(signals: ScanSignals) -> list[str]:
    return [
        host
        for host in signals.cross_domain_credential_hosts
        if host.rstrip(".").casefold() != signals.host.rstrip(".").casefold()
    ]


def evaluate_signals(signals: ScanSignals) -> list[RiskIndicator]:
    evidence: list[RiskIndicator] = []
    different_destinations = different_credential_hosts(signals)
    if signals.credential_form_count and different_destinations:
        destinations = ", ".join(different_destinations)
        evidence.append(
            RiskIndicator(
                id="cross-domain-credential",
                title="Password form sends to another domain",
                summary="A credential form points to a different hostname.",
                technical_detail=(
                    f"The observed form destination is {destinations}. "
                    "Field values and private form contents were not read."
                ),
                severity="high",
                contribution=65,
            )
        )
    if (signals.credential_form_count or signals.payment_field_count) and signals.protocol != "https:":
        evidence.append(
            RiskIndicator(
                id="http-sensitive-form",
                title="Sensitive form is served over HTTP",
                summary="A password or payment field was observed without HTTPS.",
                technical_detail=(
                    "The page uses plain HTTP. Sensitive information entered here may be "
                    "exposed in transit; no field values were accessed."
                ),
                severity="high",
                contribution=70,
            )
        )
    if signals.has_url_credentials:
        evidence.append(
            RiskIndicator(
                id="url-credentials",
                title="Address contains embedded credentials",
                summary="The URL includes a username or password section.",
                technical_detail=(
                    "Credentials embedded in an address are unusual and can be misleading. "
                    "The actual credential text was not retained."
                ),
                severity="medium",
                contribution=35,
            )
        )
    if signals.is_ip_address:
        evidence.append(
            RiskIndicator(
                id="numeric-host",
                title="Address uses a numeric host",
                summary="The site is addressed by an IP rather than a domain name.",
                technical_detail=(
                    "Numeric hosts can be legitimate, but make an organisation's domain "
                    "identity harder to verify. This signal alone does not prove fraud."
                ),
                severity="medium",
                contribution=40,
            )
        )
    if signals.is_punycode:
        evidence.append(
            RiskIndicator(
                id="punycode-host",
                title="Address contains an internationalized hostname",
                summary="A hostname label uses a punycode representation.",
                technical_detail=(
                    "Internationalized names can be legitimate, but visually similar "
                    "characters may be used to imitate another domain. Verify the spelling carefully."
                ),
                severity="medium",
                contribution=35,
            )
        )
    return evidence
