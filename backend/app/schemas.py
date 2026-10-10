from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RiskLevel = Literal["low", "medium", "high"]
SignalState = Literal["observed", "not-observed", "unavailable", "unverified", "not-checked"]
Severity = Literal["low", "medium", "high"]


def to_camel(value: str) -> str:
    first, *remaining = value.split("_")
    return first + "".join(part.capitalize() for part in remaining)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


def validate_hostname(value: object) -> str:
    if not isinstance(value, str) or not value or len(value) > 253 or any(char.isspace() for char in value):
        raise ValueError("Expected a hostname, not a URL or page content.")
    if any(char in value for char in "/?#@"):
        raise ValueError("Only hostnames may be submitted; paths and credentials are not accepted.")
    return value


class ScanSignals(ApiModel):
    model_config = ConfigDict(extra="forbid")

    protocol: Literal["http:", "https:"]
    host: str = Field(min_length=1, max_length=253)
    credential_form_count: int = Field(ge=0, le=1000)
    payment_field_count: int = Field(ge=0, le=1000)
    cross_domain_credential_hosts: list[str] = Field(max_length=100)
    external_link_count: int = Field(ge=0, le=10000)
    external_resource_hosts: list[str] = Field(max_length=100)
    redirect_count: int | None = Field(default=None, ge=0, le=1000)
    has_url_credentials: bool
    is_ip_address: bool
    is_punycode: bool

    @field_validator("host", "cross_domain_credential_hosts", "external_resource_hosts", mode="before")
    @classmethod
    def hostname_values_only(cls, value: object) -> object:
        if isinstance(value, list):
            return [validate_hostname(item) for item in value]
        return validate_hostname(value)


class RiskIndicator(ApiModel):
    id: str
    title: str
    summary: str
    technical_detail: str
    severity: Severity
    contribution: int = Field(ge=0, le=100)


class PageObservation(ApiModel):
    id: str
    label: str
    value: str
    state: SignalState
    detail: str


class ScanResult(ApiModel):
    host: str
    scanned_at: str
    source: Literal["remote"] = "remote"
    score: int = Field(ge=0, le=100)
    classification: RiskLevel
    summary: str
    recommendation: str
    evidence: list[RiskIndicator]
    observations: list[PageObservation]
