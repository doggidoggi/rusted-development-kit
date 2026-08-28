import * as vscode from "vscode";

export interface DecorationRegistry {
  types: vscode.TextEditorDecorationType[];
  apply(editor: vscode.TextEditor, ranges: Map<string, vscode.Range[]>): void;
}

/**
 * Maps decoration tags produced by lint rules (see diagnostics.ts) to the
 * editor decoration shown for them. Add an entry here to give a new rule
 * its own styling.
 */
export function createDecorationRegistry(): DecorationRegistry {
  const byTag = new Map<string, vscode.TextEditorDecorationType>([
    ["unknown", vscode.window.createTextEditorDecorationType({ color: "#e2b93d" })],
    [
      "deprecated",
      vscode.window.createTextEditorDecorationType({
        color: "#8a8a8a",
        textDecoration: "line-through",
      }),
    ],
  ]);

  return {
    types: [...byTag.values()],
    apply(editor, ranges) {
      for (const [tag, type] of byTag) {
        editor.setDecorations(type, ranges.get(tag) ?? []);
      }
    },
  };
}
