# Security and privacy test plan

## Local inspection

- Verify scanning starts only after the user presses the popup scan action.
- Verify a Chrome internal page or a non-HTTP(S) address is rejected with a clear message.
- Verify injected code collects field metadata/counts only; it must not read field values, page text, cookies, tokens, or form contents.
- Verify only credential forms with a different destination hostname add the cross-domain signal; ordinary same-domain forms and external links/resources alone remain low risk.
- Verify HTTPS is described as transport observation only, not proof of legitimacy or certificate-chain validation.
- Verify redirect information is explicitly incomplete/unavailable and never presented as a complete redirect-chain result.

## Persistence and transport

- Verify no scan data is sent over the network.
- Verify history contains hostname, time, score, classification, and source only; disable history and confirm subsequent scans are not persisted.
- Verify exported/copied reports omit URL paths, query strings, fragments, private field contents, cookies, and tokens.
- Verify demo records are labeled and never represented as a live scan.

## Interface checks

- Exercise low, medium, high, scanning, unscanned, and unavailable states.
- Validate malformed, incomplete, and non-HTTP(S) addresses.
- Check keyboard focus, evidence expansion, error/retry states, history empty state, and narrow popup widths.
