import * as vscode from "vscode";
import { getParsed, clearParsed } from "./parseCache";
import { runRules } from "./diagnostics";
import { createDecorationRegistry } from "./decorations";
import { createHoverProvider } from "./hover";

export function activate(context: vscode.ExtensionContext) {
  const diagnostics =
    vscode.languages.createDiagnosticCollection("rustedwarfare");
  context.subscriptions.push(diagnostics);

  const decorations = createDecorationRegistry();
  context.subscriptions.push(...decorations.types);

  function update(document: vscode.TextDocument) {
    if (document.uri.scheme !== "file") return;
    if (document.languageId !== "rustedwarfare") return;

    const parsed = getParsed(document);
    const { diagnostics: problems, decorationRanges } = runRules(parsed);
    diagnostics.set(document.uri, problems);

    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document === document) {
        decorations.apply(editor, decorationRanges);
      }
    }
  }

  vscode.workspace.onDidOpenTextDocument(update, null, context.subscriptions);
  vscode.workspace.onDidChangeTextDocument(
    (e) => update(e.document),
    null,
    context.subscriptions,
  );
  vscode.workspace.onDidCloseTextDocument(
    (document) => {
      clearParsed(document.uri);
      diagnostics.delete(document.uri);
    },
    null,
    context.subscriptions,
  );
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) update(editor.document);
    },
    null,
    context.subscriptions,
  );
  if (vscode.window.activeTextEditor) {
    update(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      "rustedwarfare",
      createHoverProvider(),
    ),
  );
}
