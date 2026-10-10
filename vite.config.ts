import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: resolve(projectRoot, "index.html"),
        popup: resolve(projectRoot, "extension/popup/popup.html"),
        background: resolve(projectRoot, "extension/background.ts"),
        offscreen: resolve(projectRoot, "extension/offscreen.html")
      },
      output: {
        entryFileNames: (chunk) => chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js"
      }
    },
    emptyOutDir: true
  },
  plugins: [
    react(),
    {
      name: "copy-extension-manifest",
      closeBundle() {
        mkdirSync(resolve(projectRoot, "dist/popup"), { recursive: true });
        mkdirSync(resolve(projectRoot, "dist/icons"), { recursive: true });
        copyFileSync(
          resolve(projectRoot, "dist/extension/popup/popup.html"),
          resolve(projectRoot, "dist/popup/popup.html")
        );
        copyFileSync(resolve(projectRoot, "extension/manifest.json"), resolve(projectRoot, "dist/manifest.json"));
        copyFileSync(resolve(projectRoot, "extension/icons/trustlens.svg"), resolve(projectRoot, "dist/icons/trustlens.svg"));
        for (const size of [16, 32, 48, 128]) {
          copyFileSync(
            resolve(projectRoot, `extension/icons/trustlens-${size}.png`),
            resolve(projectRoot, `dist/icons/trustlens-${size}.png`)
          );
        }
        copyFileSync(
          resolve(projectRoot, "flutie8211-high-pitch-alarm-buzzer-464349.mp3"),
          resolve(projectRoot, "dist/flutie8211-high-pitch-alarm-buzzer-464349.mp3")
        );
      }
    }
  ]
});
