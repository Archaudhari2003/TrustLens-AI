# TrustLens AI

TrustLens AI — Smart Web Trust Engine is a local-first website risk inspector delivered as a Chrome extension, with a React web preview and a separate, optional FastAPI analysis service. It looks for a small set of observable website signals and explains what it finds.

**TrustLens is a heuristic aid, not a malware scanner or a guarantee that a website is safe.** A low-risk result means only that this scan did not find strong indicators in the metadata it checks; it does not verify site ownership, reputation, or certificate chains.

## Contents

- [Features](#features)
- [How risk assessment works](#how-risk-assessment-works)
- [Privacy and permissions](#privacy-and-permissions)
- [Requirements](#requirements)
- [Run the web preview](#run-the-web-preview)
- [Build and install the Chrome extension](#build-and-install-the-chrome-extension)
- [Run the optional analysis API](#run-the-optional-analysis-api)
- [Tests](#tests)
- [Project layout](#project-layout)
- [Limitations](#limitations)

## Features

- Scan the active HTTP or HTTPS page from the Chrome extension popup or side panel.
- Inspect page structure for password and payment fields, credential-form destinations, external links and resources, and limited browser navigation timing.
- Assess URL structure for numeric IP hosts, punycode hostnames, and embedded URL credentials.
- View an explainable score, risk indicators, recommended actions, and detailed page observations.
- Receive local notifications for medium- and high-risk findings when automatic detection is enabled. The optional beep is reserved for high-risk findings.
- Keep scan history and preferences in browser-local storage; history can be disabled in Settings.
- Export or copy an assessment as JSON, PDF, or text.
- Try clearly labeled low-, medium-, and high-risk examples in the web preview without scanning a real website.
- Optionally run a metadata-only FastAPI service independently of the extension.

## How risk assessment works

The extension uses transparent local rules, not a trained machine-learning model or a reputation database. Its score starts at **8/100**; the local scanner uses **30** as the medium-risk threshold and **65** as the high-risk threshold. High-risk evidence includes a password form that submits to another hostname or sensitive fields served over HTTP. Numeric hosts, embedded URL credentials, and punycode hostnames are medium-risk signals. The local scanner caps a score based only on medium-severity evidence below the high-risk threshold.

External links, external resources, or an ordinary same-domain password form are not treated as strong risk indicators on their own. Findings describe signals to investigate; they do not establish that a site is fraudulent or compromised.

## Privacy and permissions

Page inspection runs on the device. TrustLens does not read password or payment values, page text, cookies, tokens, or private form contents, and the extension does not send browsing data to a remote analyzer. It inspects only HTTP and HTTPS pages.

The Chrome extension requests permissions for active-tab access and script injection to inspect pages; local and session storage for preferences, history, and alert state; notifications for automatic risk alerts; the offscreen document for high-risk alert audio; and the side-panel API. Its HTTP/HTTPS host permissions support local page inspection and automatic detection.

When scan history is enabled, TrustLens stores only a hostname, scan time, score, classification, and scan source on the device. It does not save URL paths or query strings. Automatic detection is enabled by default and checks eligible pages as they finish loading; turn it off in **Settings → Automatic bad-site detection** to disable those background checks. Individual scans can also be started from the popup.

See [docs/privacy.md](docs/privacy.md) for additional detail.

## Requirements

- Google Chrome 116 or later for the extension and browser side panel.
- Node.js and npm to run the web preview, build the extension, and run the frontend tests.
- Python 3.10 or later to run the optional backend and its tests.

## Run the web preview

From the repository root:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. The preview cannot inspect the browser's active tab or scan an arbitrary URL. Use **Try a labeled demo** to view example assessments; each demo is identified as demo data, not a live scan.

To type-check and create a production build:

```powershell
npm run build
```

The build creates both the web preview and the unpacked extension in `dist/`.

## Build and install the Chrome extension

1. Build the project:

   ```powershell
   npm install
   npm run build
   ```

2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Select **Load unpacked** and choose the repository's `dist` folder.
4. Open a regular HTTP or HTTPS page, then select the TrustLens toolbar icon and choose **Scan this page**.
5. To pin the extension, open Chrome's Extensions menu and pin TrustLens.

The extension manifest, popup, background service worker, and matching brand icons are packaged into `dist`. After rebuilding, return to `chrome://extensions` and reload TrustLens to apply changes.

## Run the optional analysis API

The FastAPI backend is a standalone, rule-based service. **The browser extension is not connected to it**, and enabling or running the service does not change extension scans. It analyzes only the page metadata explicitly submitted by a client; it does not visit or fetch the target website.

From the repository root, create and activate a virtual environment, then install the backend dependencies:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

The API listens on `http://127.0.0.1:8000`:

- `GET /health` reports service status.
- `POST /analyze` accepts validated page-signal metadata and returns a rule-based assessment.
- `GET /docs` opens the interactive API documentation.

Keep this prototype bound to localhost. It has no authentication or deployment hardening; do not expose it to the public internet.

To run the backend tests:

```powershell
python -m pytest backend\tests
```

## Tests

Run the frontend test suite from the repository root:

```powershell
npm test
```

Run the backend tests separately after installing the backend dependencies:

```powershell
python -m pytest backend\tests
```

## Project layout

```text
backend/
  app/                 FastAPI routes, request schemas, rules, and scoring
  tests/               Backend API and scoring tests
docs/
  architecture.md      System design and runtime boundaries
  demo-script.md       Guided demo steps
  privacy.md           Data inspected, stored, and not collected
extension/
  background.ts        Automatic local inspection and notifications
  icons/               Shared popup and Chrome extension logo assets
  popup/               Popup entry point, UI styles, and local persistence
  scanner/             Active-page metadata inspection and risk rules
  shared/              Scan contracts, fixtures, and shared constants
  src/App.tsx          Popup, side-panel, preview, and report views
tests/                 Frontend scanner and report-export tests
```

For more information, see [docs/architecture.md](docs/architecture.md), [docs/demo-script.md](docs/demo-script.md), and [docs/privacy.md](docs/privacy.md).

## Limitations

- The scan is a heuristic based on metadata currently available to the extension; it does not inspect website content or execute a malware/reputation scan.
- Site ownership, reputation, and TLS certificate-chain details are not verified.
- Browser timing information cannot establish the complete network redirect chain.
- A low score does not prove that a website is safe, and a risk signal alone does not prove fraud.
- The web preview's arbitrary-address check cannot scan a live website; use the installed extension for active-page inspection.
- The FastAPI backend is separate from the extension and is not currently used for extension scans.
