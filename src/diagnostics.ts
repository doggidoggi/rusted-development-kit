import * as vscode from "vscode";
import { ParsedDocument } from "./model";
import {
	lookupField,
	isKnownSectionType,
	isDeprecated,
	SectionTypes,
} from "./schema";

/**
 * A single lint check. New rules are plain objects implementing this
 * interface and registered in `defaultRules` below — nothing else needs
 * to change to add a new diagnostic.
 */
export interface LintRule {
	id: string;
	check(doc: ParsedDocument): RuleFinding[];
}

export interface RuleFinding {
	range: vscode.Range;
	message: string;
	severity: vscode.DiagnosticSeverity;
	/** Optional tag used to pick an editor decoration for this finding. */
	decoration?: string;
	diagnosticTags?: vscode.DiagnosticTag[];
}

const copyFromSectionTargets: LintRule = {
	id: "copy-from-section-target",
	check(doc) {
		const findings: RuleFinding[] = [];
		const sectionNames = new Set(doc.sections.map((s) => s.name));

		for (const section of doc.sections) {
			for (const field of section.fields) {
				if (field.key !== "@copyFromSection") continue;

				const targets = field.value
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean);

				for (const target of targets) {
					if (target.startsWith("ROOT:")) continue;
					if (!sectionNames.has(target)) {
						findings.push({
							range: field.valueRange,
							message: `Section "${target}" not found in file`,
							severity: vscode.DiagnosticSeverity.Warning,
						});
					}
				}
			}
		}

		return findings;
	},
};

const unknownFields: LintRule = {
	id: "unknown-field",
	check(doc) {
		const findings: RuleFinding[] = [];

		for (const section of doc.sections) {
			if (!isKnownSectionType(section.type)) continue;

			for (const field of section.fields) {
				if (field.isDirective) continue;
				if (lookupField(section.type, field.key)) continue;
				if (section.type === SectionTypes.Template) continue;

				findings.push({
					range: field.keyRange,
					message: `Field "${field.key}" not found for [${section.type}_*]`,
					severity: vscode.DiagnosticSeverity.Information,
					decoration: "unknown",
				});
			}
		}

		return findings;
	},
};

const deprecatedFields: LintRule = {
	id: "deprecated-field",
	check(doc) {
		const findings: RuleFinding[] = [];

		for (const section of doc.sections) {
			if (!isKnownSectionType(section.type)) continue;

			for (const field of section.fields) {
				if (field.isDirective) continue;

				const fieldDoc = lookupField(section.type, field.key);
				if (!fieldDoc || !isDeprecated(fieldDoc)) continue;

				findings.push({
					range: field.keyRange,
					message: `Deprecated (${fieldDoc.group}), but still works`,
					severity: vscode.DiagnosticSeverity.Information,
					decoration: "deprecated",
					diagnosticTags: [vscode.DiagnosticTag.Deprecated],
				});
			}
		}

		return findings;
	},
};

export const defaultRules: LintRule[] = [
	copyFromSectionTargets,
	unknownFields,
	deprecatedFields,
];

export interface LintResult {
	diagnostics: vscode.Diagnostic[];
	decorationRanges: Map<string, vscode.Range[]>;
}

export function runRules(
	doc: ParsedDocument,
	rules: LintRule[] = defaultRules,
): LintResult {
	const diagnostics: vscode.Diagnostic[] = [];
	const decorationRanges = new Map<string, vscode.Range[]>();

	for (const rule of rules) {
		for (const finding of rule.check(doc)) {
			const diagnostic = new vscode.Diagnostic(
				finding.range,
				finding.message,
				finding.severity,
			);
			diagnostic.source = rule.id;
			if (finding.diagnosticTags)
				diagnostic.tags = finding.diagnosticTags;
			diagnostics.push(diagnostic);

			if (finding.decoration) {
				const ranges = decorationRanges.get(finding.decoration) ?? [];
				ranges.push(finding.range);
				decorationRanges.set(finding.decoration, ranges);
			}
		}
	}

	return { diagnostics, decorationRanges };
}
