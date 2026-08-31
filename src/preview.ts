import * as path from 'path';
import * as vscode from 'vscode';
import { findImageFile } from './imageSources';
import { parseXamlToHtml } from './parser';
import { loadStyleRegistry } from './styleSources';

type PreviewOpenTarget = 'sidebar' | 'editor';

type PreviewHost = {
	webview: vscode.Webview;
	setTitle: (title: string) => void;
};

let previewPanel: vscode.WebviewPanel | undefined;
let sidebarProvider: XamlPreviewerViewProvider | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let previewSourceUri: vscode.Uri | undefined;
let renderGeneration = 0;

function getOutputChannel(): vscode.OutputChannel {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('XAML Previewer');
	}
	return outputChannel;
}

const DEFAULT_HOVER_SHADOW_RGB = '124, 58, 237';

function getOpenTarget(): PreviewOpenTarget {
	return vscode.workspace
		.getConfiguration('xaml-previewer')
		.get<PreviewOpenTarget>('openTarget', 'sidebar');
}

function parseCssColorToRgb(value: string | undefined): string {
	if (!value) {
		return DEFAULT_HOVER_SHADOW_RGB;
	}

	const trimmed = value.trim();
	const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(trimmed);
	if (hex) {
		let digits = hex[1];
		if (digits.length === 3 || digits.length === 4) {
			digits = digits
				.slice(0, 3)
				.split('')
				.map((part) => part + part)
				.join('');
		} else {
			digits = digits.slice(0, 6);
		}
		return [
			parseInt(digits.slice(0, 2), 16),
			parseInt(digits.slice(2, 4), 16),
			parseInt(digits.slice(4, 6), 16),
		].join(', ');
	}

	const rgb =
		/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(
			trimmed
		);
	if (rgb) {
		return [
			Math.min(255, Number(rgb[1])),
			Math.min(255, Number(rgb[2])),
			Math.min(255, Number(rgb[3])),
		].join(', ');
	}

	return DEFAULT_HOVER_SHADOW_RGB;
}

function getHoverShadowRgb(): string {
	return parseCssColorToRgb(
		vscode.workspace
			.getConfiguration('xaml-previewer')
			.get<string>('hoverShadowColor', '#7c3aed')
	);
}

function getShowUnknownTags(): boolean {
	return vscode.workspace
		.getConfiguration('xaml-previewer')
		.get<boolean>('showUnknownTags', false);
}

function getColorScheme(): 'light' | 'dark' {
	const kind = vscode.window.activeColorTheme.kind;
	if (
		kind === vscode.ColorThemeKind.Light ||
		kind === vscode.ColorThemeKind.HighContrastLight
	) {
		return 'light';
	}
	return 'dark';
}

function getNonce(): string {
	const possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let text = '';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function getLocalResourceRoots(documentUri?: vscode.Uri): vscode.Uri[] {
	const roots: vscode.Uri[] = [];
	for (const folder of vscode.workspace.workspaceFolders ?? []) {
		roots.push(folder.uri);
	}
	if (documentUri?.scheme === 'file') {
		const dir = vscode.Uri.file(path.dirname(documentUri.fsPath));
		if (!roots.some((root) => dir.fsPath.startsWith(root.fsPath))) {
			roots.push(dir);
		}
	}
	return roots;
}

function applyWebviewOptions(
	webview: vscode.Webview,
	documentUri?: vscode.Uri
): void {
	webview.options = {
		enableScripts: true,
		localResourceRoots: getLocalResourceRoots(documentUri),
	};
}

function createImageResolver(
	webview: vscode.Webview,
	documentUri: vscode.Uri
): (source: string) => string | undefined {
	return (source: string) => {
		const trimmed = source.trim();
		if (/^(https?:|data:)/i.test(trimmed)) {
			return trimmed;
		}
		const workspaceFolders = (vscode.workspace.workspaceFolders ?? []).map(
			(folder) => folder.uri.fsPath
		);
		const filePath = findImageFile(trimmed, documentUri.fsPath, workspaceFolders);
		if (!filePath) {
			return undefined;
		}
		return webview.asWebviewUri(vscode.Uri.file(filePath)).toString();
	};
}

function getLoadingHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>XAML Previewer</title>
	<style>
		html, body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			font-family: var(--vscode-font-family, sans-serif);
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
		}

		.loading {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 16px;
		}

		.spinner {
			width: 32px;
			height: 32px;
			border: 3px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35));
			border-top-color: var(--vscode-progressBar-background, #0078d4);
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
		}

		@keyframes spin {
			to { transform: rotate(360deg); }
		}

		.message {
			margin: 0;
			font-size: 14px;
		}
	</style>
</head>
<body>
	<div class="loading">
		<div class="spinner" role="status" aria-label="Loading"></div>
		<p class="message">Loading preview</p>
	</div>
</body>
</html>`;
}

function getMessageHtml(message: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>XAML Previewer</title>
	<style>
		html, body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
			font-family: var(--vscode-font-family, sans-serif);
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
		}
		p { padding: 16px; margin: 0; }
	</style>
</head>
<body>
	<p>${message}</p>
</body>
</html>`;
}

function getPreviewTitle(uri: vscode.Uri): string {
	const fileName = path.basename(uri.fsPath) || 'XAML';
	return `${fileName} (Preview)`;
}

function isXamlDocument(document: vscode.TextDocument): boolean {
	const languageId = document.languageId;
	const filePath = document.uri.fsPath.toLowerCase();
	return (
		languageId === 'xaml' ||
		languageId === 'axaml' ||
		filePath.endsWith('.xaml') ||
		filePath.endsWith('.axaml')
	);
}

function findOpenXamlEditor(uri: vscode.Uri): vscode.TextEditor | undefined {
	const uriStr = uri.toString();
	return vscode.window.visibleTextEditors.find(
		(editor) => editor.document.uri.toString() === uriStr
	);
}

function findOpenXamlViewColumn(uri: vscode.Uri): vscode.ViewColumn | undefined {
	const visible = findOpenXamlEditor(uri);
	if (visible?.viewColumn !== undefined) {
		return visible.viewColumn;
	}

	const uriStr = uri.toString();
	for (const group of vscode.window.tabGroups.all) {
		for (const tab of group.tabs) {
			const input = tab.input;
			if (
				input instanceof vscode.TabInputText &&
				input.uri.toString() === uriStr
			) {
				return group.viewColumn;
			}
		}
	}

	return undefined;
}

function handlePreviewMessage(message: unknown): void {
	if (
		message &&
		typeof message === 'object' &&
		'type' in message &&
		(message as { type: string }).type === 'navigateToLine' &&
		'line' in message &&
		typeof (message as { line: unknown }).line === 'number'
	) {
		void navigateToSourceLine((message as { line: number }).line);
	}
}

async function navigateToSourceLine(line: number): Promise<void> {
	if (!previewSourceUri || !Number.isFinite(line) || line < 1) {
		return;
	}

	const existingEditor = findOpenXamlEditor(previewSourceUri);
	const existingColumn = findOpenXamlViewColumn(previewSourceUri);

	const editor = existingEditor
		? await vscode.window.showTextDocument(existingEditor.document, {
				viewColumn: existingEditor.viewColumn,
				preserveFocus: false,
			})
		: await vscode.window.showTextDocument(previewSourceUri, {
				viewColumn: existingColumn ?? vscode.ViewColumn.Beside,
				preserveFocus: false,
				preview: false,
			});

	const lineIndex = Math.min(
		Math.max(line - 1, 0),
		editor.document.lineCount - 1
	);
	const position = new vscode.Position(lineIndex, 0);
	const range = new vscode.Range(position, position);
	editor.selection = new vscode.Selection(position, position);
	editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

function getEditorHost(): PreviewHost | undefined {
	if (!previewPanel) {
		return undefined;
	}

	return {
		webview: previewPanel.webview,
		setTitle: (title) => {
			if (previewPanel) {
				previewPanel.title = title;
			}
		},
	};
}

function getActiveHost(): PreviewHost | undefined {
	if (getOpenTarget() === 'sidebar') {
		return sidebarProvider?.getHost();
	}

	return getEditorHost();
}

async function renderDocument(document: vscode.TextDocument): Promise<void> {
	const host = getActiveHost();
	if (!host) {
		return;
	}

	const generation = ++renderGeneration;
	previewSourceUri = document.uri;
	host.setTitle(getPreviewTitle(document.uri));
	applyWebviewOptions(host.webview, document.uri);
	host.webview.html = getLoadingHtml();

	const output = getOutputChannel();
	output.clear();

	const source = document.getText();
	const styleRegistry = await loadStyleRegistry(document.uri, output);

	if (generation !== renderGeneration || getActiveHost()?.webview !== host.webview) {
		return;
	}

	const result = parseXamlToHtml(source, output, {
		nonce: getNonce(),
		cspSource: host.webview.cspSource,
		styleRegistry,
		resolveImageSrc: createImageResolver(host.webview, document.uri),
		hoverShadowRgb: getHoverShadowRgb(),
		showUnknownTags: getShowUnknownTags(),
		colorScheme: getColorScheme(),
	});
	if (result.hasUnknown || result.error) {
		output.show(true);
	}
	host.webview.html = result.html;
}

async function renderActiveEditor(): Promise<void> {
	const host = getActiveHost();
	if (!host) {
		return;
	}

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		previewSourceUri = undefined;
		host.setTitle('XAML Previewer');
		host.webview.html = getMessageHtml('No active editor to preview.');
		const output = getOutputChannel();
		output.clear();
		output.appendLine('No active editor to preview.');
		output.show(true);
		return;
	}

	await renderDocument(editor.document);
}

function openEditorPreview(): void {
	if (previewPanel) {
		previewPanel.reveal(vscode.ViewColumn.Beside);
		void renderActiveEditor();
		return;
	}

	const editor = vscode.window.activeTextEditor;
	previewPanel = vscode.window.createWebviewPanel(
		'xamlPreviewer',
		editor ? getPreviewTitle(editor.document.uri) : 'XAML Previewer',
		vscode.ViewColumn.Beside,
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: getLocalResourceRoots(editor?.document.uri),
		}
	);

	previewPanel.webview.onDidReceiveMessage(handlePreviewMessage);

	previewPanel.onDidDispose(() => {
		previewPanel = undefined;
		if (getOpenTarget() === 'editor') {
			previewSourceUri = undefined;
		}
	});

	void renderActiveEditor();
}

async function openSidebarPreview(): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		sidebarProvider?.setPendingDocument(editor.document);
	}

	if (sidebarProvider?.getHost()) {
		sidebarProvider.show();
		const pending = sidebarProvider.takePendingDocument();
		if (pending) {
			await renderDocument(pending);
			return;
		}

		await renderActiveEditor();
		return;
	}

	await vscode.commands.executeCommand(
		`${XamlPreviewerViewProvider.viewId}.focus`
	);
}

class XamlPreviewerViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'xamlPreviewer.sidebar';

	private view: vscode.WebviewView | undefined;
	private pendingDocument: vscode.TextDocument | undefined;

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;
		applyWebviewOptions(webviewView.webview);
		webviewView.webview.onDidReceiveMessage(handlePreviewMessage);
		webviewView.onDidDispose(() => {
			if (this.view === webviewView) {
				this.view = undefined;
			}
		});

		const pending = this.takePendingDocument();
		if (pending) {
			void renderDocument(pending);
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (editor && isXamlDocument(editor.document)) {
			void renderDocument(editor.document);
			return;
		}

		webviewView.title = 'XAML Previewer';
		webviewView.webview.html = getMessageHtml(
			'Open a .xaml or .axaml file to preview.'
		);
	}

	getHost(): PreviewHost | undefined {
		if (!this.view) {
			return undefined;
		}

		return {
			webview: this.view.webview,
			setTitle: (title) => {
				if (this.view) {
					this.view.title = title;
				}
			},
		};
	}

	setPendingDocument(document: vscode.TextDocument): void {
		this.pendingDocument = document;
	}

	takePendingDocument(): vscode.TextDocument | undefined {
		const document = this.pendingDocument;
		this.pendingDocument = undefined;
		return document;
	}

	show(): void {
		this.view?.show(true);
	}

	clear(): void {
		this.view = undefined;
		this.pendingDocument = undefined;
	}
}

export function registerPreviewViewProvider(
	context: vscode.ExtensionContext
): void {
	sidebarProvider = new XamlPreviewerViewProvider();
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			XamlPreviewerViewProvider.viewId,
			sidebarProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
			}
		)
	);
}

export function refreshPreviewForSavedDocument(
	document: vscode.TextDocument
): void {
	if (!getActiveHost() || !previewSourceUri) {
		return;
	}

	if (document.uri.toString() !== previewSourceUri.toString()) {
		return;
	}

	void renderDocument(document);
}

export function refreshPreviewForConfigurationChange(
	e: vscode.ConfigurationChangeEvent
): void {
	if (e.affectsConfiguration('xaml-previewer.hoverShadowColor')) {
		const host = getActiveHost();
		if (host) {
			void host.webview.postMessage({
				type: 'hoverShadowColor',
				rgb: getHoverShadowRgb(),
			});
		}
	}

	if (!e.affectsConfiguration('xaml-previewer.showUnknownTags')) {
		return;
	}

	if (!getActiveHost() || !previewSourceUri) {
		return;
	}

	const document = vscode.workspace.textDocuments.find(
		(item) => item.uri.toString() === previewSourceUri?.toString()
	);
	if (document) {
		void renderDocument(document);
	}
}

export function refreshPreviewForActiveEditor(
	editor: vscode.TextEditor | undefined
): void {
	const document = editor?.document;
	if (!document || !isXamlDocument(document) || !getActiveHost()) {
		return;
	}

	if (previewSourceUri?.toString() === document.uri.toString()) {
		return;
	}

	void renderDocument(document);
}

export function openXamlPreview(): void {
	if (getOpenTarget() === 'sidebar') {
		void openSidebarPreview();
		return;
	}

	openEditorPreview();
}

export function disposePreview(): void {
	previewPanel?.dispose();
	previewPanel = undefined;
	previewSourceUri = undefined;
	sidebarProvider?.clear();
	outputChannel?.dispose();
	outputChannel = undefined;
}
