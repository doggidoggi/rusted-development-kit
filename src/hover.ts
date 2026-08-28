import * as vscode from "vscode";
import { getParsed } from "./parseCache";
import { lookupField, isDeprecated } from "./schema";

export function createHoverProvider(): vscode.HoverProvider {
  return {
    provideHover(document, position) {
      const parsed = getParsed(document);

      const section = parsed.sections.find((s) =>
        s.headerRange.contains(position),
      );
      if (section) {
        const md = new vscode.MarkdownString();
        md.supportThemeIcons = true;
        md.appendCodeblock(`[${section.name}]`, "rustedwarfare");
        md.appendMarkdown(`$(symbol-namespace) \`${section.type}\``);
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
            md.appendMarkdown(`$(circle-slash) not found in docs \`${s.type}\``);
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
  };
}
