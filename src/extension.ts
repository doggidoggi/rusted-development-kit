import * as vscode from "vscode";
import { parse } from "./model";
import { lookupField, isKnownSectionType, isDeprecated } from "./schema";

export function activate(context: vscode.ExtensionContext) {
  const diagnostics =
    vscode.languages.createDiagnosticCollection("rustedwarfare");
  context.subscriptions.push(diagnostics);

  const unknownFieldDecoration = vscode.window.createTextEditorDecorationType({
    color: "#e2b93d",
  });
  const deprecatedFieldDecoration =
    vscode.window.createTextEditorDecorationType({
      color: "#8a8a8a",
      textDecoration: "line-through",
    });
  context.subscriptions.push(unknownFieldDecoration, deprecatedFieldDecoration);

  function update(document: vscode.TextDocument) {
    if (document.uri.scheme !== "file") return;
    if (document.languageId !== "rustedwarfare") return;

    const parsed = parse(document);
    const sectionNames = new Set(parsed.sections.map((s) => s.name));

    const problems: vscode.Diagnostic[] = [];
    const unknownRanges: vscode.Range[] = [];
    const deprecatedRanges: vscode.Range[] = [];

    for (const section of parsed.sections) {
      for (const field of section.fields) {
        if (field.key === "@copyFromSection") {
          const targets = field.value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          for (const target of targets) {
            if (target.startsWith("ROOT:")) continue;
            if (!sectionNames.has(target)) {
              problems.push(
                new vscode.Diagnostic(
                  field.valueRange,
                  `Section "${target}" not found in file`,
                  vscode.DiagnosticSeverity.Warning,
                ),
              );
            }
          }
          continue;
        }

        if (field.isDirective || !isKnownSectionType(section.type)) continue;

        const doc = lookupField(section.type, field.key);
        if (!doc) {
          unknownRanges.push(field.keyRange);
          problems.push(
            new vscode.Diagnostic(
              field.keyRange,
              `Field "${field.key}" not found for [${section.type}_*]`,
              vscode.DiagnosticSeverity.Information,
            ),
          );
        } else if (isDeprecated(doc)) {
          deprecatedRanges.push(field.keyRange);
          const d = new vscode.Diagnostic(
            field.keyRange,
            `Deprecated (${doc.group}), but still works`,
            vscode.DiagnosticSeverity.Information,
          );
          d.tags = [vscode.DiagnosticTag.Deprecated];
          problems.push(d);
        }
      }
    }

    diagnostics.set(document.uri, problems);

    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document === document) {
        editor.setDecorations(unknownFieldDecoration, unknownRanges);
        editor.setDecorations(deprecatedFieldDecoration, deprecatedRanges);
      }
    }
  }

  vscode.workspace.onDidOpenTextDocument(update, null, context.subscriptions);
  vscode.workspace.onDidChangeTextDocument(
    (e) => update(e.document),
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

  const hoverProvider = vscode.languages.registerHoverProvider(
    "rustedwarfare",
    {
      provideHover(document, position) {
        const parsed = parse(document);

        const section = parsed.sections.find((s) =>
          s.headerRange.contains(position),
        );
        if (section) {
          const md = new vscode.MarkdownString();
          md.supportThemeIcons = true;
          md.appendCodeblock(`[${section.name}]`, "rustedwarfare");
          md.appendMarkdown(
            `$(symbol-namespace) \`${section.type}\``,
          );
          return new vscode.Hover(md);
        }

        for (const s of parsed.sections) {
          for (const field of s.fields) {
            const onKey = field.keyRange.contains(position);
            const onValue = field.valueRange.contains(position);
            if (!onKey && !onValue) continue;
            if (field.isDirective) return undefined;

            const doc = lookupField(s.type, field.key);
            const md = new vscode.MarkdownString();
            md.supportThemeIcons = true;

            if (!doc) {
              md.appendCodeblock(field.key, "rustedwarfare");
              md.appendMarkdown(
                `$(circle-slash) not found in docs \`${s.type}\``,
              );
              return new vscode.Hover(md);
            }

            const signature = doc.valueType
              ? `${doc.key}: ${doc.valueType}`
              : doc.key;
            md.appendCodeblock(signature, "rustedwarfare");

            const badges: string[] = [];
            if (doc.group) badges.push(`$(tag) ${doc.group}`);
            if (isDeprecated(doc))
              badges.push(`$(warning) Deprecated, but still works`);
            if (badges.length) {
              md.appendMarkdown(badges.join("&nbsp;&nbsp;&nbsp;") + "\n\n");
            }

            md.appendMarkdown("---\n\n");
            if (doc.description) {
              md.appendMarkdown(`${doc.description}\n\n`);
            }
            if (doc.example) {
              md.appendMarkdown("$(code) *Example*");
              md.appendCodeblock(doc.example, "rustedwarfare");
            }
            if (doc.since) {
              md.appendMarkdown(`$(history) *Added in ${doc.since}*`);
            }

            return new vscode.Hover(md);
          }
        }

        return undefined;
      },
    },
  );
  context.subscriptions.push(hoverProvider);
}
