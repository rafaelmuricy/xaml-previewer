import * as fs from 'fs';
import * as path from 'path';

const URI_PREFIX = /^(https?:|data:|ms-appx:|ms-appx-web:|file:|avares:)/i;

interface MauiImageSpec {
	dir: string;
	recursive: boolean;
	fileName?: string;
	extension?: string;
}

interface CsprojCache {
	mtimeMs: number;
	includes: string[];
}

const csprojIncludesCache = new Map<string, CsprojCache>();

function hasUriPrefix(source: string): boolean {
	return URI_PREFIX.test(source.trim());
}

export function parseMauiImageIncludes(csprojText: string): string[] {
	const withoutComments = csprojText.replace(/<!--[\s\S]*?-->/g, '');
	const includes: string[] = [];
	const tagRe = /<MauiImage\b([^>]*?)(?:\/>|>)/gi;
	let match: RegExpExecArray | null;
	while ((match = tagRe.exec(withoutComments))) {
		const include = /\bInclude\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(match[1]);
		const value = include?.[1] ?? include?.[2];
		if (value?.trim()) {
			includes.push(value.trim());
		}
	}
	return includes;
}

export function findNearestCsproj(fromDir: string): string | undefined {
	let dir = path.resolve(fromDir);
	for (;;) {
		let names: string[] = [];
		try {
			names = fs.readdirSync(dir);
		} catch {
			names = [];
		}
		const csprojs = names.filter((name) => name.toLowerCase().endsWith('.csproj'));
		if (csprojs.length === 1) {
			return path.join(dir, csprojs[0]);
		}
		if (csprojs.length > 1) {
			const withMaui = csprojs.find(
				(name) => loadMauiImageIncludes(path.join(dir, name)).length > 0
			);
			return path.join(dir, withMaui ?? csprojs[0]);
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			return undefined;
		}
		dir = parent;
	}
}

function loadMauiImageIncludes(csprojPath: string): string[] {
	try {
		const stat = fs.statSync(csprojPath);
		const cached = csprojIncludesCache.get(csprojPath);
		if (cached && cached.mtimeMs === stat.mtimeMs) {
			return cached.includes;
		}
		const includes = parseMauiImageIncludes(fs.readFileSync(csprojPath, 'utf8'));
		csprojIncludesCache.set(csprojPath, { mtimeMs: stat.mtimeMs, includes });
		return includes;
	} catch {
		return [];
	}
}

function parseMauiImageInclude(include: string): MauiImageSpec | undefined {
	if (/\$\(/.test(include)) {
		return undefined;
	}
	const posix = include
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\.\//, '')
		.replace(/^\/+/, '');
	if (!posix) {
		return undefined;
	}

	const segments = posix.split('/').filter(Boolean);
	const last = segments[segments.length - 1] ?? '';
	const recursive = segments.some((segment) => segment === '**');
	const lastIsGlob = /[*?]/.test(last) || last === '**';

	if (!lastIsGlob) {
		return {
			dir: segments.slice(0, -1).join('/'),
			recursive: false,
			fileName: last,
		};
	}

	const dirParts = segments.filter(
		(segment) => segment !== '**' && !/[*?]/.test(segment)
	);
	const extMatch = /^\*\.(\w+)$/.exec(last);
	return {
		dir: dirParts.join('/'),
		recursive,
		extension: extMatch ? `.${extMatch[1].toLowerCase()}` : undefined,
	};
}

function isFile(filePath: string): boolean {
	try {
		return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
	} catch {
		return false;
	}
}

function listFilesForInclude(csprojDir: string, include: string): string[] {
	const spec = parseMauiImageInclude(include);
	if (!spec) {
		return [];
	}

	const absDir = spec.dir
		? path.join(csprojDir, ...spec.dir.split('/'))
		: csprojDir;
	if (spec.fileName && !spec.recursive) {
		const exact = path.join(absDir, spec.fileName);
		return isFile(exact) ? [exact] : [];
	}

	const files: string[] = [];
	const visit = (dir: string): void => {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (spec.recursive) {
					visit(full);
				}
				continue;
			}
			if (!entry.isFile()) {
				continue;
			}
			if (
				spec.extension &&
				!entry.name.toLowerCase().endsWith(spec.extension)
			) {
				continue;
			}
			files.push(full);
		}
	};
	visit(absDir);
	return files;
}

function sourceMatchesMauiFile(
	source: string,
	filePath: string,
	csprojDir: string
): boolean {
	const wanted = source.trim().replace(/\\/g, '/').replace(/^\/+/, '');
	const wantedBase = path.basename(wanted).toLowerCase();
	const fileBase = path.basename(filePath).toLowerCase();
	if (fileBase === wantedBase) {
		return true;
	}

	if (!path.extname(wantedBase)) {
		const parsed = path.parse(fileBase);
		if (parsed.name.toLowerCase() === wantedBase) {
			return true;
		}
	}

	const rel = path.relative(csprojDir, filePath).replace(/\\/g, '/').toLowerCase();
	return rel === wanted.toLowerCase();
}

function findMauiImage(
	source: string,
	documentPath: string
): string | undefined {
	const csproj = findNearestCsproj(path.dirname(documentPath));
	if (!csproj) {
		return undefined;
	}
	const includes = loadMauiImageIncludes(csproj);
	if (includes.length === 0) {
		return undefined;
	}
	const csprojDir = path.dirname(csproj);
	for (const include of includes) {
		for (const file of listFilesForInclude(csprojDir, include)) {
			if (sourceMatchesMauiFile(source, file, csprojDir)) {
				return file;
			}
		}
	}
	return undefined;
}

function stripUriPrefix(source: string): string {
	return source
		.replace(/^ms-appx:\/\/\/?/i, '')
		.replace(/^ms-appx-web:\/\/\/?/i, '')
		.replace(/^file:\/\/\/?/i, '');
}

function findRelativeImageFile(
	source: string,
	documentPath: string,
	workspaceFolders: string[]
): string | undefined {
	const relative = stripUriPrefix(source.trim()).replace(/\\/g, '/');
	if (!relative || /^(https?:|data:)/i.test(source.trim())) {
		return undefined;
	}
	const relPath = relative.replace(/\//g, path.sep);
	let dir = path.dirname(documentPath);
	for (let i = 0; i < 10; i++) {
		const candidate = path.join(dir, relPath);
		if (isFile(candidate)) {
			return candidate;
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			break;
		}
		dir = parent;
	}
	for (const folder of workspaceFolders) {
		const candidate = path.join(folder, relPath);
		if (isFile(candidate)) {
			return candidate;
		}
	}
	return undefined;
}

/**
 * Resolves Image.Source to a local file path.
 * Unprefixed values use MAUI lookup (`MauiImage` in the nearest csproj),
 * then the existing relative-path search.
 */
export function findImageFile(
	source: string,
	documentPath: string,
	workspaceFolders: string[] = []
): string | undefined {
	const trimmed = source.trim();
	if (!trimmed || /^(https?:|data:)/i.test(trimmed)) {
		return undefined;
	}

	if (!hasUriPrefix(trimmed)) {
		const maui = findMauiImage(trimmed, documentPath);
		if (maui) {
			return maui;
		}
	}

	return findRelativeImageFile(trimmed, documentPath, workspaceFolders);
}
