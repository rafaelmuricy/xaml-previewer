import * as vscode from 'vscode';
import {
	disposePreview,
	openXamlPreview,
	refreshPreviewForActiveEditor,
	refreshPreviewForConfigurationChange,
	refreshPreviewForSavedDocument,
	registerPreviewViewProvider,
} from './preview';

const HAS_CODE_BEHIND_CONTEXT = 'xaml-previewer.hasCodeBehind';

function isXamlDocument(document: vscode.TextDocument | undefined): document is vscode.TextDocument {
	if (!document) {
		return false;
	}

	const languageId = document.languageId;
	const filePath = document.uri.fsPath.toLowerCase();
	return (
		languageId === 'xaml' ||
		languageId === 'axaml' ||
		filePath.endsWith('.xaml') ||
		filePath.endsWith('.axaml')
	);
}

function getCodeBehindUri(xamlUri: vscode.Uri): vscode.Uri {
	return vscode.Uri.file(`${xamlUri.fsPath}.cs`);
}

async function hasCodeBehind(xamlUri: vscode.Uri): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(getCodeBehindUri(xamlUri));
		return true;
	} catch {
		return false;
	}
}

async function updateHasCodeBehindContext(editor: vscode.TextEditor | undefined): Promise<void> {
	const document = editor?.document;
	const exists = isXamlDocument(document)
		? await hasCodeBehind(document.uri)
		: false;

	await vscode.commands.executeCommand('setContext', HAS_CODE_BEHIND_CONTEXT, exists);
}

async function openCodeBehind(): Promise<void> {
	const document = vscode.window.activeTextEditor?.document;
	if (!isXamlDocument(document)) {
		return;
	}

	const codeBehindUri = getCodeBehindUri(document.uri);
	if (!(await hasCodeBehind(document.uri))) {
		return;
	}

	await vscode.window.showTextDocument(codeBehindUri);
}

export function activate(context: vscode.ExtensionContext) {
	registerPreviewViewProvider(context);

	const openPreviewDisposable = vscode.commands.registerCommand(
		'xaml-previewer.openPreview',
		() => {
			openXamlPreview();
		}
	);

	const viewCodeDisposable = vscode.commands.registerCommand(
		'xaml-previewer.viewCode',
		() => {
			openCodeBehind();
		}
	);

	const saveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
		refreshPreviewForSavedDocument(document);
	});

	const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
		updateHasCodeBehindContext(editor);
		refreshPreviewForActiveEditor(editor);
	});

	const configurationDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
		refreshPreviewForConfigurationChange(e);
	});

	const xamlCodeBehindWatcher = vscode.workspace.createFileSystemWatcher('**/*.xaml.cs');
	const axamlCodeBehindWatcher = vscode.workspace.createFileSystemWatcher('**/*.axaml.cs');
	const refreshCodeBehindContext = () => {
		updateHasCodeBehindContext(vscode.window.activeTextEditor);
	};

	updateHasCodeBehindContext(vscode.window.activeTextEditor);

	context.subscriptions.push(
		openPreviewDisposable,
		viewCodeDisposable,
		saveDisposable,
		editorChangeDisposable,
		configurationDisposable,
		xamlCodeBehindWatcher,
		xamlCodeBehindWatcher.onDidCreate(refreshCodeBehindContext),
		xamlCodeBehindWatcher.onDidDelete(refreshCodeBehindContext),
		axamlCodeBehindWatcher,
		axamlCodeBehindWatcher.onDidCreate(refreshCodeBehindContext),
		axamlCodeBehindWatcher.onDidDelete(refreshCodeBehindContext)
	);
}

export function deactivate() {
	disposePreview();
}
