import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	indexResourceTree,
	ResourceRegistry,
} from './parser/resourceRegistry';
import { parseXamlToNodes } from './parser/xml';

interface CachedFile {
	mtimeMs: number;
	own: ResourceRegistry;
	mergedSources: string[];
	isMaui: boolean;
}

let genericCache:
	| { filePath: string; mtimeMs: number; registry: ResourceRegistry }
	| undefined;
const fileCache = new Map<string, CachedFile>();

function compareVersion(a: string, b: string): number {
	const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
	const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) {
			return diff;
		}
	}
	return 0;
}

async function findGenericXamlPath(): Promise<string | undefined> {
	const root = path.join(
		os.homedir(),
		'.nuget',
		'packages',
		'microsoft.windowsappsdk.winui'
	);
	if (!fsSync.existsSync(root)) {
		return undefined;
	}

	const versions = (await fs.readdir(root, { withFileTypes: true }))
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort(compareVersion)
		.reverse();

	for (const version of versions) {
		const verDir = path.join(root, version);
		let entries: string[];
		try {
			entries = await fs.readdir(verDir, { recursive: true });
		} catch {
			continue;
		}

		const matches = entries
			.filter((entry) =>
				entry.replace(/\\/g, '/').toLowerCase().endsWith('/themes/generic.xaml')
			)
			.map((entry) => path.join(verDir, entry));

		const preferred = matches.find((filePath) =>
			filePath.toLowerCase().includes(`${path.sep}microsoft.winui${path.sep}`.toLowerCase())
		);
		if (preferred) {
			return preferred;
		}
		if (matches[0]) {
			return matches[0];
		}
	}

	return undefined;
}

async function loadGenericXaml(
	output: vscode.OutputChannel
): Promise<ResourceRegistry | undefined> {
	const filePath = await findGenericXamlPath();
	if (!filePath) {
		output.appendLine(
			'WinUI generic.xaml not found in NuGet cache (microsoft.windowsappsdk.winui).'
		);
		return undefined;
	}

	try {
		const stat = await fs.stat(filePath);
		if (
			genericCache &&
			genericCache.filePath === filePath &&
			genericCache.mtimeMs === stat.mtimeMs
		) {
			return genericCache.registry;
		}

		const text = await fs.readFile(filePath, 'utf8');
		const nodes = parseXamlToNodes(text);
		const registry = new ResourceRegistry();
		indexResourceTree(nodes, registry, []);
		genericCache = { filePath, mtimeMs: stat.mtimeMs, registry };
		return registry;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		output.appendLine(`Failed to load WinUI generic.xaml: ${message}`);
		return undefined;
	}
}

function pathProximity(fromPath: string, toPath: string): number {
	const fromParts = fromPath.split(path.sep);
	const toParts = toPath.split(path.sep);
	let i = 0;
	while (
		i < fromParts.length &&
		i < toParts.length &&
		fromParts[i].toLowerCase() === toParts[i].toLowerCase()
	) {
		i++;
	}
	return i;
}

async function findNearestAppXaml(
	documentUri: vscode.Uri
): Promise<string | undefined> {
	const files = [
		...(await vscode.workspace.findFiles(
			'**/App.xaml',
			'**/{node_modules,bin,obj,.git}/**'
		)),
		...(await vscode.workspace.findFiles(
			'**/App.axaml',
			'**/{node_modules,bin,obj,.git}/**'
		)),
	];
	if (files.length === 0) {
		return undefined;
	}

	if (documentUri.scheme !== 'file') {
		return files[0].fsPath;
	}

	const docPath = documentUri.fsPath;
	let best = files[0];
	let bestScore = pathProximity(docPath, best.fsPath);
	for (const file of files.slice(1)) {
		const score = pathProximity(docPath, file.fsPath);
		if (
			score > bestScore ||
			(score === bestScore && file.fsPath.length < best.fsPath.length)
		) {
			best = file;
			bestScore = score;
		}
	}
	return best.fsPath;
}

function stripMsAppx(source: string): string {
	return source
		.replace(/^ms-appx:\/\/\/?/i, '')
		.replace(/^ms-appx-web:\/\/\/?/i, '');
}

/**
 * Turns StyleInclude / ResourceDictionary Source values into a project-relative
 * POSIX path. Supports `avares://Assembly/Path`, `ms-appx:///`, and `/Path`.
 */
function toPosixResourcePath(source: string): string | undefined {
	const trimmed = source.trim();
	if (!trimmed || /^resm:/i.test(trimmed)) {
		return undefined;
	}

	const avares = /^avares:\/\/[^/]+\/(.+)$/i.exec(trimmed);
	const raw = avares ? avares[1] : stripMsAppx(trimmed);
	const posix = raw.replace(/\\/g, '/').replace(/^\/+/, '');
	return posix || undefined;
}

async function resolveMergedSource(
	source: string,
	fromDir: string
): Promise<string | undefined> {
	const posix = toPosixResourcePath(source);
	if (!posix) {
		return undefined;
	}

	const relPath = posix.replace(/\//g, path.sep);
	let dir = fromDir;
	for (let i = 0; i < 10; i++) {
		const candidate = path.join(dir, relPath);
		if (fsSync.existsSync(candidate)) {
			return candidate;
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			break;
		}
		dir = parent;
	}

	for (const folder of vscode.workspace.workspaceFolders ?? []) {
		const candidate = path.join(folder.uri.fsPath, relPath);
		if (fsSync.existsSync(candidate)) {
			return candidate;
		}
	}

	const matches = await vscode.workspace.findFiles(
		`**/${posix}`,
		'**/{node_modules,bin,obj,.git}/**'
	);
	return matches[0]?.fsPath;
}

function isMauiResourceDocument(
	text: string,
	mergedSources: string[]
): boolean {
	if (
		mergedSources.some((source) =>
			/(?:^|\/)resources\/styles\/(?:colors|styles)\.xaml$/i.test(
				source.replace(/\\/g, '/')
			)
		)
	) {
		return true;
	}
	return /xmlns\s*=\s*["'][^"']*dotnet\/2021\/maui/i.test(text);
}

async function loadResourceFile(
	filePath: string,
	output: vscode.OutputChannel,
	loading: Set<string>
): Promise<ResourceRegistry | undefined> {
	const resolved = path.resolve(filePath);
	if (loading.has(resolved)) {
		return undefined;
	}
	loading.add(resolved);

	try {
		const stat = await fs.stat(resolved);
		let cached = fileCache.get(resolved);
		if (!cached || cached.mtimeMs !== stat.mtimeMs) {
			const text = await fs.readFile(resolved, 'utf8');
			const nodes = parseXamlToNodes(text);
			const own = new ResourceRegistry();
			const mergedSources: string[] = [];
			indexResourceTree(nodes, own, mergedSources);
			cached = {
				mtimeMs: stat.mtimeMs,
				own,
				mergedSources,
				isMaui: isMauiResourceDocument(text, mergedSources),
			};
			fileCache.set(resolved, cached);
		}

		const registry = new ResourceRegistry();
		for (const source of cached.mergedSources) {
			const abs = await resolveMergedSource(source, path.dirname(resolved));
			if (!abs) {
				output.appendLine(`Could not resolve style source: ${source}`);
				continue;
			}
			const nested = await loadResourceFile(abs, output, loading);
			if (nested) {
				registry.merge(nested);
			}
		}
		registry.merge(cached.own);
		return registry;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		output.appendLine(`Failed to load resource dictionary [${resolved}]: ${message}`);
		return undefined;
	}
}

export async function loadStyleRegistry(
	documentUri: vscode.Uri,
	output: vscode.OutputChannel
): Promise<ResourceRegistry> {
	const registry = new ResourceRegistry();

	const appXaml = await findNearestAppXaml(documentUri);
	const appRegistry = appXaml
		? await loadResourceFile(appXaml, output, new Set())
		: undefined;
	const mauiApp = appXaml
		? fileCache.get(path.resolve(appXaml))?.isMaui === true
		: false;

	if (!mauiApp) {
		const generic = await loadGenericXaml(output);
		if (generic) {
			registry.merge(generic);
		}
	}

	if (appRegistry) {
		registry.merge(appRegistry);
	}

	return registry;
}
