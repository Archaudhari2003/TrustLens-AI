# TrustLens AI

TrustLens AI is a local-first Chrome extension popup and a browser preview for reviewing observable website risk signals. It is a prototype, not a reputation service or a guarantee that a site is safe.

## Run the preview

```sh
npm install
npm run dev
```

The preview cannot inspect the active browser tab. Use its explicitly labeled low-, medium-, and high-risk demo scenarios to explore the interface. Typing an arbitrary address does not fabricate a scan result.

## Build the Chrome extension

```sh
npm run build
```

In Chrome 116+, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the generated `dist` folder. Click the TrustLens toolbar icon for the compact popup; use its side-panel button to open the same experience in the browser sidebar. The extension requests access to HTTP/HTTPS websites so the optional automatic detector can inspect pages as they finish loading. This permission is needed for automatic page metadata inspection; no page data is sent to a server.

The local scanner reads the current page's protocol and hostname, counts password/payment field types and external links, compares credential form destination hostnames, and records external resource hostnames. It does not read form values, cookies, tokens, or page text. It does not inspect certificate chains, site reputation, or the complete network redirect chain. External links and resources are not treated as malicious by themselves.

Scans are local heuristic assessments. Scores are explainable rule contributions, not model output; direct high-risk findings scale modestly with the number of observed sensitive forms or distinct credential destinations, while unchanged evidence produces a repeatable score. History, when enabled, stores only the hostname, scan time, risk category, score, and demo/local label in browser-local storage. Reports can be copied or exported as PDF and JSON; exports contain assessment observations but no query string or form contents.

Automatic bad-site detection and its beep alert are enabled by default in Settings. Automatic inspection runs locally when an HTTP/HTTPS page finishes loading and reports high-risk results using a browser notification; the separate beep toggle controls playback of the included alert audio. High-risk alerts require direct high-severity evidence, such as a password form posting to a different hostname or a sensitive form served over HTTP; weaker URL signals alone cannot add up to a high-risk beep. Automatic detection checks the same local signals as a popup scan, including page structure, but does not inspect protected browser pages. It is a heuristic, not a reputation service, and a low-risk result is not a guarantee of safety. Both features can be disabled independently in Settings.

## Backend integration

The FastAPI API in `backend/app` accepts only structured metadata signals; it never fetches the target website and rejects unmodeled fields. Run it locally with:

```sh
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload
```

The API exposes `/health` and `POST /analyze`. The popup is not connected to it yet: the typed `ScanningService` contract in `extension/scanner/scanningService.ts` currently performs local inspection and uses separate fixtures for the web preview. Remote classification is intentionally shown as unavailable and is not presented as a working toggle. Connecting the API requires explicit consent, a reviewed data-minimization policy, and a restricted extension host permission.

## Verify

```sh
npm test
npm run build
npm run test:backend
```
