import * as vscode from "vscode";

export function registerFormatter(context: vscode.ExtensionContext) {
	const formatter = vscode.languages.registerDocumentFormattingEditProvider(
		"ini",
		{
			provideDocumentFormattingEdits(
				document: vscode.TextDocument,
			): vscode.TextEdit[] {
				const fullText = document.getText();
				const formatted = formatIni(fullText);
				const fullRange = new vscode.Range(
					document.positionAt(0),
					document.positionAt(fullText.length),
				);
				return [vscode.TextEdit.replace(fullRange, formatted)];
			},
		},
	);
	context.subscriptions.push(formatter);
}

export function formatIni(text: string, eol: string = "\n"): string {
	const lines = text.split(/\r?\n/);
	const result: string[] = [];
	let block: string[] = [];

	function flushBlock() {
		if (block.length === 0) return;
		result.push(...alignBlock(block));
		block = [];
	}

	function isDividerComment(trimmed: string): boolean {
		return /^#{2,}/.test(trimmed);
	}

	function pushBoundary(line: string) {
		const lastLine = result[result.length - 1];
		const lastTrimmed = lastLine?.trim() ?? "";

		if (lastTrimmed !== "") {
			result.push("");
		}

		result.push(line);
	}

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed === "") {
			continue; // пустые строки внутри секции просто выбрасываем
		}

		const isSectionHeader = trimmed.startsWith("[");
		const isDivider = isDividerComment(trimmed);
		const isBoundary = isSectionHeader || isDivider;

		if (isBoundary) {
			flushBlock();
			pushBoundary(line);
		} else {
			block.push(line);
		}
	}

	flushBlock();
	return result.join(eol);
}

function alignBlock(lines: string[]): string[] {
	const keyPattern =
		/^\s*(@[A-Za-z]+(?:\s+[A-Za-z_][A-Za-z0-9_]*)?|[A-Za-z_][A-Za-z0-9_]*)\s*:/;
	const fullPattern =
		/^(\s*)((?:@[A-Za-z]+(?:\s+[A-Za-z_][A-Za-z0-9_]*)?|[A-Za-z_][A-Za-z0-9_]*))\s*:\s*(.*?)\s*$/;

	let maxKeyLength = 0;
	for (const line of lines) {
		const match = line.match(keyPattern);
		if (match) maxKeyLength = Math.max(maxKeyLength, match[1].length);
	}

	return lines.map((line) => {
		const match = line.match(fullPattern);
		if (!match) return line;
		const [, indent, key, value] = match;
		const padding = " ".repeat(maxKeyLength - key.length);
		return `${indent}${key}${padding}: ${value}`;
	});
}
