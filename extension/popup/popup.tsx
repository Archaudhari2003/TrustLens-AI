import React from "react";
import ReactDOM from "react-dom/client";
import App from "../src/App";
import "./popup.css";

if (globalThis.chrome?.runtime?.id) {
  document.documentElement.dataset.extensionPopup = "true";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
