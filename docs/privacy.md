# Privacy

TrustLens AI performs the current scan locally in the active tab. The popup reads only the active tab's HTTP(S) URL and inspects page structure after the user presses **Scan this page**.

## Data inspected

- Page protocol and hostname.
- Count of password forms and payment fields, based on field type/autocomplete metadata.
- Hostnames used as password-form destinations.
- Counts/hostnames for external links and resources.
- Limited browser navigation-timing redirect information, shown as unavailable for complete-chain conclusions.

The scanner does not read field values, page text, cookies, authentication tokens, or private form contents. It does not inspect certificate chains, reputation feeds, or every network redirect.

## Storage and sharing

When scan history is enabled, browser-local storage keeps only hostname, scan time, score, classification, and whether the record is a demo. URL paths, query strings, page content, and form values are not saved. The current implementation makes no remote classification requests. Export and copy actions are user initiated.

Demo scenarios are synthetic examples using reserved `.example` hostnames. They are labeled as demo data and are not evidence about live websites.
