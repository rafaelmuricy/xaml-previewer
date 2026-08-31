import type { XmlNode } from './types';
import { getAttr, getElementClasses } from './xml';

export type ResourceKind =
	| 'style'
	| 'color'
	| 'brush'
	| 'thickness'
	| 'cornerRadius'
	| 'double'
	| 'fontFamily'
	| 'alias'
	| 'other';

export interface ResourceEntry {
	kind: ResourceKind;
	key: string;
	node: XmlNode;
	aliasOf?: string;
}

export type SelectorCombinator = 'descendant' | 'child';

export interface SelectorSegment {
	/** Lowercase type name; omitted for class-only / name-only / `*`. */
	targetType?: string;
	classes: string[];
	name?: string;
	/** How this segment relates to the previous one (unset on the first). */
	combinator?: SelectorCombinator;
}

export interface ParsedSelector {
	segments: SelectorSegment[];
}

export interface SelectorStyle {
	selector: ParsedSelector;
	node: XmlNode;
}

export class ResourceRegistry {
	private readonly entries = new Map<string, ResourceEntry>();
	private readonly implicitStyles = new Map<string, XmlNode>();
	private readonly selectorStyles: SelectorStyle[] = [];

	set(entry: ResourceEntry): void {
		this.entries.set(entry.key, entry);
	}

	setImplicitStyle(targetType: string, node: XmlNode): void {
		this.implicitStyles.set(targetType.toLowerCase(), node);
	}

	addSelectorStyle(selector: ParsedSelector, node: XmlNode): void {
		if (selector.segments.length === 0) {
			return;
		}
		this.selectorStyles.push({ selector, node });
	}

	merge(other: ResourceRegistry): void {
		for (const [key, entry] of other.entries) {
			this.entries.set(key, entry);
		}
		for (const [type, node] of other.implicitStyles) {
			this.implicitStyles.set(type, node);
		}
		this.selectorStyles.push(...other.selectorStyles);
	}

	get(key: string): ResourceEntry | undefined {
		return this.entries.get(key);
	}

	getStyle(key: string): XmlNode | undefined {
		const entry = this.entries.get(key);
		return entry?.kind === 'style' ? entry.node : undefined;
	}

	getImplicitStyle(targetType: string): XmlNode | undefined {
		let current: string | undefined = targetType.toLowerCase();
		const original = current;
		while (current) {
			const style = this.implicitStyles.get(current);
			if (style) {
				if (
					current === original ||
					isTruthyXaml(getAttr(style, 'ApplyToDerivedTypes'))
				) {
					return style;
				}
			}
			current = mauiBaseType(current);
		}
		return undefined;
	}

	getMatchingSelectorStyles(node: XmlNode): XmlNode[] {
		return this.selectorStyles
			.filter((style) => matchesSelector(style.selector, node))
			.sort(
				(a, b) =>
					selectorSpecificity(a.selector) - selectorSpecificity(b.selector)
			)
			.map((style) => style.node);
	}
}

function isTruthyXaml(value: string | undefined): boolean {
	return value !== undefined && !/^(false|0)$/i.test(value.trim());
}

/**
 * MAUI control type → base type, used with `ApplyToDerivedTypes="True"`
 * (e.g. Style TargetType="Page" applies to ContentPage).
 */
function mauiBaseType(type: string): string | undefined {
	switch (type) {
		case 'contentpage':
		case 'navigationpage':
		case 'tabbedpage':
		case 'flyoutpage':
		case 'templatedpage':
			return 'page';
		case 'verticalstacklayout':
		case 'horizontalstacklayout':
		case 'stacklayout':
		case 'grid':
		case 'flexlayout':
		case 'absolutelayout':
			return 'layout';
		case 'border':
		case 'frame':
		case 'contentview':
		case 'scrollview':
			return 'view';
		case 'layout':
			return 'view';
		case 'page':
		case 'shell':
		case 'view':
			return 'visualelement';
		default:
			return undefined;
	}
}

function localTypeName(targetType: string): string {
	const trimmed = targetType.trim();
	const colon = trimmed.lastIndexOf(':');
	return (colon >= 0 ? trimmed.slice(colon + 1) : trimmed).toLowerCase();
}

function kindForTag(localName: string): ResourceKind | undefined {
	switch (localName) {
		case 'style':
			return 'style';
		case 'staticresource':
			return 'alias';
		case 'color':
			return 'color';
		case 'thickness':
			return 'thickness';
		case 'cornerradius':
			return 'cornerRadius';
		case 'double':
		case 'int32':
		case 'gridlength':
			return 'double';
		case 'fontfamily':
			return 'fontFamily';
		default:
			if (localName.endsWith('brush')) {
				return 'brush';
			}
			return 'other';
	}
}

function addResource(node: XmlNode, registry: ResourceRegistry): void {
	const key = getAttr(node, 'Key');
	const kind = kindForTag(node.localName) ?? 'other';

	if (kind === 'style') {
		const targetType = getAttr(node, 'TargetType');
		if (!key && targetType) {
			registry.setImplicitStyle(localTypeName(targetType), node);
			return;
		}
	}

	if (!key) {
		return;
	}

	if (kind === 'alias') {
		const aliasOf = getAttr(node, 'ResourceKey');
		if (!aliasOf) {
			return;
		}
		registry.set({ kind, key, node, aliasOf });
		return;
	}

	registry.set({ kind, key, node });
}

function isThemeDictionaries(name: string): boolean {
	return (
		name === 'resourcedictionary.themedictionaries' ||
		name.endsWith('.themedictionaries')
	);
}

function isMergedDictionaries(name: string): boolean {
	return (
		name === 'resourcedictionary.mergeddictionaries' ||
		name.endsWith('.mergeddictionaries')
	);
}

function isResourcesProperty(name: string): boolean {
	return name === 'application.resources' || name.endsWith('.resources');
}

function isStylesContainer(name: string): boolean {
	return (
		name === 'styles' ||
		name === 'application.styles' ||
		name.endsWith('.styles')
	);
}

function isStyleInclude(name: string): boolean {
	return name === 'styleinclude' || name === 'resourceinclude';
}

function parseSegment(raw: string): SelectorSegment | undefined {
	const trimmed = raw.trim();
	if (!trimmed || /[:^[\]]/.test(trimmed)) {
		return undefined;
	}

	let rest = trimmed;
	let targetType: string | undefined;
	if (rest.startsWith('*')) {
		rest = rest.slice(1);
	} else if (rest[0] !== '.' && rest[0] !== '#') {
		const typeMatch = /^([A-Za-z_][\w|]*)/.exec(rest);
		if (!typeMatch) {
			return undefined;
		}
		const rawType = typeMatch[1];
		const pipe = rawType.lastIndexOf('|');
		targetType = (pipe >= 0 ? rawType.slice(pipe + 1) : rawType).toLowerCase();
		rest = rest.slice(typeMatch[0].length);
	}

	const classes: string[] = [];
	let name: string | undefined;
	const tokenRe = /([.#])([A-Za-z_][\w-]*)/g;
	let last = 0;
	let match: RegExpExecArray | null;
	while ((match = tokenRe.exec(rest)) !== null) {
		if (match.index !== last) {
			return undefined;
		}
		if (match[1] === '.') {
			classes.push(match[2]);
		} else {
			name = match[2];
		}
		last = tokenRe.lastIndex;
	}
	if (last !== rest.length) {
		return undefined;
	}
	if (!targetType && classes.length === 0 && !name) {
		return undefined;
	}
	return { targetType, classes, name };
}

/**
 * Parses Avalonia selectors: `Button`, `Button.primary`, `.foo`, `#name`,
 * descendant (`Grid.barraBotoesInferior Button`) and child (`Grid > Button`).
 * Templates, host (`^`), attribute, and pseudo-class selectors are skipped.
 */
function parseAvaloniaSelector(selector: string): ParsedSelector | undefined {
	const trimmed = selector.trim();
	if (
		!trimmed ||
		trimmed.includes('/template/') ||
		/[:^[\]]/.test(trimmed)
	) {
		return undefined;
	}

	const parts: string[] = [];
	const combinators: SelectorCombinator[] = [];
	const splitRe = /\s*(>|\*\*)\s*|\s+/g;
	let last = 0;
	let match: RegExpExecArray | null;
	while ((match = splitRe.exec(trimmed)) !== null) {
		const part = trimmed.slice(last, match.index);
		if (part) {
			parts.push(part);
			combinators.push(match[1] === '>' ? 'child' : 'descendant');
		}
		last = splitRe.lastIndex;
	}
	const tail = trimmed.slice(last);
	if (tail) {
		parts.push(tail);
	}
	if (parts.length === 0) {
		return undefined;
	}

	const segments: SelectorSegment[] = [];
	for (let i = 0; i < parts.length; i++) {
		const segment = parseSegment(parts[i]);
		if (!segment) {
			return undefined;
		}
		if (i > 0) {
			segment.combinator = combinators[i - 1];
		}
		segments.push(segment);
	}
	return { segments };
}

function isPropertyOrResourceParent(node: XmlNode): boolean {
	const name = node.localName;
	return (
		name.includes('.') ||
		name === 'resources' ||
		name === 'styles' ||
		name.endsWith('.resources') ||
		name.endsWith('.styles')
	);
}

function visualParent(node: XmlNode): XmlNode | undefined {
	let current = node.parent;
	while (current && isPropertyOrResourceParent(current)) {
		current = current.parent;
	}
	return current;
}

function elementName(node: XmlNode): string | undefined {
	const name = getAttr(node, 'Name');
	return name || undefined;
}

function matchesSegment(node: XmlNode, segment: SelectorSegment): boolean {
	if (segment.targetType && segment.targetType !== node.localName) {
		return false;
	}
	if (segment.classes.length > 0) {
		const classSet = new Set(getElementClasses(node));
		if (segment.classes.some((cls) => !classSet.has(cls))) {
			return false;
		}
	}
	if (segment.name && segment.name !== elementName(node)) {
		return false;
	}
	return true;
}

function matchesSelector(selector: ParsedSelector, node: XmlNode): boolean {
	const { segments } = selector;
	if (segments.length === 0) {
		return false;
	}

	if (!matchesSegment(node, segments[segments.length - 1])) {
		return false;
	}

	let ancestor = visualParent(node);
	for (let i = segments.length - 2; i >= 0; i--) {
		const segment = segments[i];
		const combinator = segments[i + 1].combinator ?? 'descendant';
		if (combinator === 'child') {
			if (!ancestor || !matchesSegment(ancestor, segment)) {
				return false;
			}
			ancestor = visualParent(ancestor);
			continue;
		}

		let found = false;
		while (ancestor) {
			if (matchesSegment(ancestor, segment)) {
				found = true;
				ancestor = visualParent(ancestor);
				break;
			}
			ancestor = visualParent(ancestor);
		}
		if (!found) {
			return false;
		}
	}
	return true;
}

function selectorSpecificity(selector: ParsedSelector): number {
	let score = 0;
	for (const segment of selector.segments) {
		if (segment.targetType) {
			score += 1;
		}
		score += segment.classes.length * 10;
		if (segment.name) {
			score += 100;
		}
	}
	return score;
}

function indexStyleNode(
	node: XmlNode,
	registry: ResourceRegistry,
	inStyles: boolean
): void {
	const selector = getAttr(node, 'Selector');
	if (selector) {
		for (const group of selector.split(',')) {
			const parsed = parseAvaloniaSelector(group);
			if (parsed) {
				registry.addSelectorStyle(parsed, node);
			}
		}
	} else if (inStyles) {
		const targetType = getAttr(node, 'TargetType');
		if (targetType) {
			registry.addSelectorStyle(
				{ segments: [{ targetType: localTypeName(targetType), classes: [] }] },
				node
			);
		}
	}
	addResource(node, registry);
}

/**
 * Walks Application / ResourceDictionary / Styles trees, indexing keyed resources
 * and Avalonia selector styles. Theme dictionaries: only `Default` is indexed.
 * Merged `Source` paths (MergedDictionaries, StyleInclude, ResourceInclude) are collected.
 */
export function indexResourceTree(
	nodes: XmlNode[],
	registry: ResourceRegistry,
	mergedSources: string[],
	inStyles = false
): void {
	for (const node of nodes) {
		const name = node.localName;
		const nextInStyles = inStyles || isStylesContainer(name);

		if (name.startsWith('design.') || name.startsWith('?')) {
			continue;
		}

		if (
			name === 'application' ||
			isResourcesProperty(name) ||
			isStylesContainer(name)
		) {
			indexResourceTree(node.children, registry, mergedSources, nextInStyles);
			continue;
		}

		if (name === 'resourcedictionary') {
			const source = getAttr(node, 'Source');
			if (source) {
				mergedSources.push(source);
			}
			indexResourceTree(node.children, registry, mergedSources, nextInStyles);
			continue;
		}

		if (isStyleInclude(name)) {
			const source = getAttr(node, 'Source');
			if (source) {
				mergedSources.push(source);
			}
			continue;
		}

		if (isThemeDictionaries(name)) {
			const def = node.children.find((child) => {
				if (child.localName !== 'resourcedictionary') {
					return false;
				}
				return (getAttr(child, 'Key') ?? '').toLowerCase() === 'default';
			});
			if (def) {
				indexResourceTree(def.children, registry, mergedSources, nextInStyles);
			}
			continue;
		}

		if (isMergedDictionaries(name)) {
			for (const child of node.children) {
				const source = getAttr(child, 'Source');
				if (source) {
					mergedSources.push(source);
					continue;
				}
				if (child.localName === 'resourcedictionary') {
					indexResourceTree(
						child.children,
						registry,
						mergedSources,
						nextInStyles
					);
				}
			}
			continue;
		}

		if (name === 'style') {
			indexStyleNode(node, registry, nextInStyles);
			continue;
		}

		addResource(node, registry);
	}
}

/**
 * Merges `*.Resources` / `*.Styles` on a node into a new registry that inherits `current`.
 * Returns undefined when the node has neither.
 */
export function mergeLocalResources(
	node: XmlNode,
	current: ResourceRegistry | undefined
): ResourceRegistry | undefined {
	const resources = node.children.find(
		(child) =>
			child.localName === 'resources' || child.localName.endsWith('.resources')
	);
	const styles = node.children.find(
		(child) =>
			child.localName === 'styles' || child.localName.endsWith('.styles')
	);
	if (!resources && !styles) {
		return undefined;
	}
	const local = new ResourceRegistry();
	if (current) {
		local.merge(current);
	}
	if (resources) {
		indexResourceTree([resources], local, []);
	}
	if (styles) {
		indexResourceTree([styles], local, []);
	}
	return local;
}
