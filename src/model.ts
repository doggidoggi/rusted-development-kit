import * as vscode from "vscode";

export interface ParsedField {
  key: string;
  value: string;
  isDirective: boolean; // keys like "@copyFromSection"
  lineNumber: number;
  keyRange: vscode.Range;
  valueRange: vscode.Range;
}

export interface ParsedSection {
  name: string; // "hiddenAction_20mmTargetForTanks"
  type: string; // "hiddenAction"
  subName: string | null; // "20mmTargetForTanks"
  headerRange: vscode.Range;
  fields: ParsedField[];
}

export interface ParsedDocument {
  sections: ParsedSection[];
}

const SECTION_RE = /^\s*\[([A-Za-z0-9_]+)\]\s*$/;
const FIELD_RE = /^(\s*)(@?[A-Za-z0-9_.\-]+)\s*:(.*)$/;

function stripComment(line: string): string {
  const idx = line.search(/#(?![0-9a-fA-F]{6}\b)/);
  return idx === -1 ? line : line.slice(0, idx);
}

export function parse(document: vscode.TextDocument): ParsedDocument {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (let i = 0; i < document.lineCount; i++) {
    const rawLine = document.lineAt(i).text;
    const line = stripComment(rawLine);
    if (!line.trim()) continue;

    const sectionMatch = SECTION_RE.exec(line);
    if (sectionMatch) {
      const fullName = sectionMatch[1];
      const underscoreIdx = fullName.indexOf("_");
      const type =
        underscoreIdx === -1 ? fullName : fullName.slice(0, underscoreIdx);
      const subName =
        underscoreIdx === -1 ? null : fullName.slice(underscoreIdx + 1);

      current = {
        name: fullName,
        type,
        subName,
        headerRange: new vscode.Range(i, 0, i, rawLine.length),
        fields: [],
      };
      sections.push(current);
      continue;
    }

    if (!current) continue;

    const fieldMatch = FIELD_RE.exec(line);
    if (fieldMatch) {
      const [, indent, key, value] = fieldMatch;
      const keyStart = indent.length;
      const keyEnd = keyStart + key.length;
      const colonIndex = line.indexOf(":", keyEnd);

      current.fields.push({
        key,
        value: value.trim(),
        isDirective: key.startsWith("@"),
        lineNumber: i,
        keyRange: new vscode.Range(i, keyStart, i, keyEnd),
        valueRange: new vscode.Range(i, colonIndex + 1, i, rawLine.length),
      });
    }
  }

  return { sections };
}
