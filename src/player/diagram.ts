// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  ViewColumn,
  WebviewPanel,
  window
} from "vscode";

const MERMAID_PATTERN = /```mermaid\n([\s\S]*?)```/g;

let diagramPanel: WebviewPanel | undefined;

export function extractDiagrams(content: string): string[] {
  const diagrams: string[] = [];
  let match;
  MERMAID_PATTERN.lastIndex = 0;
  while ((match = MERMAID_PATTERN.exec(content)) !== null) {
    diagrams.push(match[1].trim());
  }
  return diagrams;
}

export function replaceDiagramBlocks(content: string): string {
  MERMAID_PATTERN.lastIndex = 0;
  return content.replace(
    MERMAID_PATTERN,
    "📊 *Diagram rendered in the CodeTour Diagram panel*"
  );
}

export function showDiagramPanel(diagrams: string[]): void {
  if (!diagramPanel) {
    diagramPanel = window.createWebviewPanel(
      "codetour.diagram",
      "CodeTour Diagram",
      { viewColumn: ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true }
    );

    diagramPanel.onDidDispose(() => {
      diagramPanel = undefined;
    });
  }

  diagramPanel.webview.html = getDiagramWebviewContent(diagrams);
}

export function hideDiagramPanel(): void {
  if (diagramPanel) {
    diagramPanel.dispose();
    diagramPanel = undefined;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function getDiagramWebviewContent(diagrams: string[]): string {
  const nonce = generateNonce();
  const showHeading = diagrams.length > 1;
  const diagramDivs = diagrams
    .map(
      (diagram, index) =>
        `<div class="diagram-container">${
          showHeading
            ? `\n        <h3>Diagram ${index + 1}</h3>`
            : ""
        }
        <pre class="mermaid">${escapeHtml(diagram)}</pre>
      </div>`
    )
    .join("\n<hr/>\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 script-src https://cdn.jsdelivr.net 'nonce-${nonce}';
                 style-src 'nonce-${nonce}';">
  <title>CodeTour Diagram</title>
  <style nonce="${nonce}">
    body {
      padding: 16px;
      font-family: var(--vscode-font-family, sans-serif);
      color: var(--vscode-editor-foreground, #333);
      background-color: var(--vscode-editor-background, #fff);
    }
    .diagram-container {
      text-align: center;
      margin: 16px 0;
    }
    .diagram-container h3 {
      margin-bottom: 12px;
      font-size: 14px;
      opacity: 0.8;
    }
    .mermaid {
      display: flex;
      justify-content: center;
    }
    .error-message {
      color: var(--vscode-errorForeground, #f44);
      padding: 12px;
      border: 1px solid var(--vscode-errorForeground, #f44);
      border-radius: 4px;
      margin: 12px 0;
    }
    hr {
      border: none;
      border-top: 1px solid var(--vscode-panel-border, #ccc);
      margin: 24px 0;
    }
  </style>
</head>
<body>
  ${diagramDivs}
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.min.js"></script>
  <script nonce="${nonce}">
    (function() {
      if (typeof mermaid === 'undefined') {
        document.body.innerHTML =
          '<div class="error-message">' +
          'Could not load the Mermaid diagram library. ' +
          'Please check your internet connection and reload the panel.' +
          '</div>';
        return;
      }
      try {
        var isDark = document.body.getAttribute('data-vscode-theme-kind') === 'vscode-dark'
          || document.body.classList.contains('vscode-dark');
        mermaid.initialize({
          startOnLoad: true,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'var(--vscode-font-family, sans-serif)'
        });
      } catch (e) {
        document.body.innerHTML = '<div class="error-message">Failed to render diagram: ' + e.message + '</div>';
      }
    })();
  </script>
</body>
</html>`;
}
