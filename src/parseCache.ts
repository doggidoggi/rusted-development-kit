import * as vscode from "vscode";
import { parse, ParsedDocument } from "./model";

// Hover and diagnostics both need the parsed document on every keystroke;
// caching by version avoids re-parsing the same text twice per update.
const cache = new Map<string, { version: number; parsed: ParsedDocument }>();

export function getParsed(document: vscode.TextDocument): ParsedDocument {
  const key = document.uri.toString();
  const cached = cache.get(key);
  if (cached && cached.version === document.version) {
    return cached.parsed;
  }

  const parsed = parse(document);
  cache.set(key, { version: document.version, parsed });
  return parsed;
}

export function clearParsed(uri: vscode.Uri): void {
  cache.delete(uri.toString());
}
