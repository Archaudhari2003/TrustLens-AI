import type { FormMetadata } from "../shared/result-schema";

export function analyzeForms(forms: FormMetadata[], pageHost: string): {
  credentialFormCount: number;
  paymentFieldCount: number;
  crossDomainCredentialHosts: string[];
} {
  const credentialForms = forms.filter((form) => form.hasPassword);
  return {
    credentialFormCount: credentialForms.length,
    paymentFieldCount: forms.reduce((total, form) => total + form.paymentFieldCount, 0),
    crossDomainCredentialHosts: Array.from(new Set(
      credentialForms
        .map((form) => form.actionHost)
        .filter((host) => host !== pageHost)
    ))
  };
}
