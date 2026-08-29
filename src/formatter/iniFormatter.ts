import * as vscode from "vscode";

export function registerFormatter(context: vscode.ExtensionContext) {
	const formatter = vscode.languages.registerDocumentFormattingEditProvider(
		"rustedwarfare",
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

export function formatIni(text: string): string {
	return "";
}
