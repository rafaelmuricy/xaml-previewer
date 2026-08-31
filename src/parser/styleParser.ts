import { mapFontFamily, mapPropertyToCss, type MappedCss } from './cssMapping';
import type { ResourceRegistry } from './resourceRegistry';
import type { RenderContext, XmlNode } from './types';
import { getAttr, getElementClasses } from './xml';

export { getElementClasses };

export interface MarkupExtension {
	type: 'StaticResource' | 'ThemeResource' | 'DynamicResource';
	key: string;
}

export type ColorScheme = 'light' | 'dark';

export interface AppThemeBinding {
	light?: string;
	dark?: string;
	default?: string;
}

interface StyleSetter {
	property: string;
	value?: string;
	valueNode?: XmlNode;
}

const MARKUP_EXTENSION_RE =
	/^\s*\{\s*(StaticResource|ThemeResource|DynamicResource)\s+(?:ResourceKey\s*=\s*)?([A-Za-z_][\w.]*)\s*\}\s*$/i;

/** Common WinUI text styles used when generic.xaml is not available. */
const WELL_KNOWN_TEXT_STYLES: Record<string, Record<string, string>> = {
	CaptionTextBlockStyle: {
		'font-size': '12px',
		'line-height': '16px',
	},
	BodyTextBlockStyle: {
		'font-size': '14px',
		'line-height': '20px',
	},
	BodyStrongTextBlockStyle: {
		'font-size': '14px',
		'line-height': '20px',
		'font-weight': '600',
	},
	SubtitleTextBlockStyle: {
		'font-size': '20px',
		'line-height': '28px',
	},
	TitleTextBlockStyle: {
		'font-size': '28px',
		'line-height': '36px',
	},
};

/** Windows system colors that are not defined in generic.xaml. */
const SYSTEM_COLORS: Record<string, string> = {
	SystemAccentColor: '#0078D4',
	SystemAccentColorLight1: '#76B9ED',
	SystemAccentColorLight2: '#60CDFF',
	SystemAccentColorLight3: '#99EBFF',
	SystemAccentColorDark1: '#005A9E',
	SystemAccentColorDark2: '#004A80',
	SystemAccentColorDark3: '#003966',
	SystemColorWindowColor: '#FFFFFF',
	SystemColorWindowTextColor: '#000000',
};

function splitMarkupAssignments(inner: string): Array<[string, string]> {
	const result: Array<[string, string]> = [];
	let i = 0;
	const s = inner.trim();
	while (i < s.length) {
		while (i < s.length && /[\s,]/.test(s[i])) {
			i++;
		}
		if (i >= s.length) {
			break;
		}
		const eq = s.indexOf('=', i);
		if (eq < 0) {
			break;
		}
		const key = s.slice(i, eq).trim();
		i = eq + 1;
		while (i < s.length && /\s/.test(s[i])) {
			i++;
		}
		let value = '';
		if (s[i] === '{') {
			let depth = 0;
			const start = i;
			while (i < s.length) {
				if (s[i] === '{') {
					depth++;
				} else if (s[i] === '}') {
					depth--;
					if (depth === 0) {
						i++;
						break;
					}
				}
				i++;
			}
			value = s.slice(start, i);
		} else {
			const start = i;
			while (i < s.length && s[i] !== ',') {
				i++;
			}
			value = s.slice(start, i).trim();
		}
		if (key) {
			result.push([key, value]);
		}
	}
	return result;
}

/** Parses `{AppThemeBinding Light=..., Dark=..., Default=...}`. */
export function parseAppThemeBinding(value: string): AppThemeBinding | undefined {
	const match = /^\s*\{\s*AppThemeBinding\b([\s\S]*)\}\s*$/i.exec(value);
	if (!match) {
		return undefined;
	}
	const inner = match[1].replace(/^\s*,?\s*/, '').trim();
	if (!inner) {
		return {};
	}

	const binding: AppThemeBinding = {};
	const assignments = splitMarkupAssignments(inner);
	if (assignments.length === 0) {
		binding.default = inner;
		return binding;
	}

	for (const [key, raw] of assignments) {
		const name = key.toLowerCase();
		if (name === 'light' || name === 'dark' || name === 'default') {
			binding[name] = raw;
		}
	}
	return binding;
}

export function parseMarkupExtension(
	value: string
): MarkupExtension | undefined {
	const match = MARKUP_EXTENSION_RE.exec(value);
	if (!match) {
		return undefined;
	}
	const kind = match[1].toLowerCase();
	const type =
		kind === 'themeresource'
			? 'ThemeResource'
			: kind === 'dynamicresource'
				? 'DynamicResource'
				: 'StaticResource';
	return { type, key: match[2] };
}

function toCssColor(value: string): string {
	const v = value.trim();
	const argb = /^#([0-9A-Fa-f]{8})$/.exec(v);
	if (argb) {
		const hex = argb[1];
		const alpha = parseInt(hex.slice(0, 2), 16) / 255;
		const r = parseInt(hex.slice(2, 4), 16);
		const g = parseInt(hex.slice(4, 6), 16);
		const b = parseInt(hex.slice(6, 8), 16);
		if (alpha >= 1) {
			return `#${hex.slice(2)}`;
		}
		return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
	}
	return v;
}

function parseHexRgb(
	color: string
): { r: number; g: number; b: number } | undefined {
	const hex6 = /^#([0-9A-Fa-f]{6})$/.exec(color.trim());
	if (hex6) {
		return {
			r: parseInt(hex6[1].slice(0, 2), 16),
			g: parseInt(hex6[1].slice(2, 4), 16),
			b: parseInt(hex6[1].slice(4, 6), 16),
		};
	}
	const rgba =
		/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color.trim());
	if (rgba) {
		return {
			r: Number(rgba[1]),
			g: Number(rgba[2]),
			b: Number(rgba[3]),
		};
	}
	return undefined;
}

function applyOpacity(color: string, opacity: string): string {
	const op = Number(opacity);
	if (!Number.isFinite(op) || op >= 1) {
		return color;
	}
	const rgb = parseHexRgb(color);
	if (!rgb) {
		return color;
	}
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op})`;
}

function colorSchemeOf(ctx?: { colorScheme?: ColorScheme }): ColorScheme {
	return ctx?.colorScheme ?? 'dark';
}

function pickThemeValue(
	theme: AppThemeBinding,
	scheme: ColorScheme
): string | undefined {
	return scheme === 'dark'
		? theme.dark ?? theme.default ?? theme.light
		: theme.light ?? theme.default ?? theme.dark;
}

export function resolveRawValue(
	raw: string,
	registry?: ResourceRegistry,
	seen: Set<string> = new Set(),
	colorScheme: ColorScheme = 'dark'
): string | undefined {
	const me = parseMarkupExtension(raw);
	if (me) {
		return registry
			? resolveResourceValue(me.key, registry, seen, colorScheme)
			: undefined;
	}
	const theme = parseAppThemeBinding(raw);
	if (theme) {
		const chosen = pickThemeValue(theme, colorScheme);
		return chosen
			? resolveRawValue(chosen, registry, seen, colorScheme)
			: undefined;
	}
	if (/^\s*\{[\s\S]+\}\s*$/.test(raw)) {
		return undefined;
	}
	return toCssColor(raw);
}

/**
 * Resolves a brush/color element (SolidColorBrush, Color, StaticResource, …)
 * including property-element wrappers like Button.Background.
 */
export function resolveBrushNode(
	node: XmlNode,
	registry: ResourceRegistry | undefined,
	seen: Set<string> = new Set(),
	colorScheme: ColorScheme = 'dark'
): string | undefined {
	if (node.localName === 'staticresource') {
		const key = getAttr(node, 'ResourceKey');
		return key && registry
			? resolveResourceValue(key, registry, seen, colorScheme)
			: undefined;
	}

	const opacity = getAttr(node, 'Opacity');
	const color =
		getAttr(node, 'Color') ??
		getAttr(node, 'TintColor') ??
		getAttr(node, 'FallbackColor');

	let resolved: string | undefined;
	if (color) {
		resolved = resolveRawValue(color, registry, seen, colorScheme);
	} else if (node.text.trim()) {
		resolved = resolveRawValue(node.text, registry, seen, colorScheme);
	} else {
		for (const child of node.children) {
			resolved = resolveBrushNode(child, registry, seen, colorScheme);
			if (resolved) {
				break;
			}
		}
	}

	if (!resolved) {
		return undefined;
	}
	resolved = toCssColor(resolved);
	if (opacity) {
		resolved = applyOpacity(resolved, opacity);
	}
	return resolved;
}

export function resolveResourceValue(
	key: string,
	registry: ResourceRegistry,
	seen: Set<string> = new Set(),
	colorScheme: ColorScheme = 'dark'
): string | undefined {
	if (seen.has(key)) {
		return undefined;
	}
	seen.add(key);

	const entry = registry.get(key);
	if (!entry) {
		return SYSTEM_COLORS[key];
	}

	switch (entry.kind) {
		case 'alias':
			return entry.aliasOf
				? resolveResourceValue(entry.aliasOf, registry, seen, colorScheme)
				: undefined;
		case 'color':
			return entry.node.text
				? resolveRawValue(entry.node.text, registry, seen, colorScheme)
				: undefined;
		case 'brush':
			return resolveBrushNode(entry.node, registry, seen, colorScheme);
		case 'thickness':
		case 'cornerRadius':
		case 'double':
			return entry.node.text || undefined;
		case 'fontFamily':
			return entry.node.text
				? mapFontFamily(entry.node.text)
				: undefined;
		case 'other': {
			const color = getAttr(entry.node, 'Color');
			if (color) {
				return resolveRawValue(color, registry, seen, colorScheme);
			}
			return entry.node.text
				? resolveRawValue(entry.node.text, registry, seen, colorScheme)
				: undefined;
		}
		case 'style':
			return undefined;
		default:
			return undefined;
	}
}

function collectSetters(styleNode: XmlNode): StyleSetter[] {
	const setters: StyleSetter[] = [];
	for (const child of styleNode.children) {
		if (child.localName !== 'setter') {
			continue;
		}
		const property = getAttr(child, 'Property');
		if (!property || property.toLowerCase() === 'template') {
			continue;
		}
		const value = getAttr(child, 'Value');
		if (value !== undefined) {
			setters.push({ property, value });
			continue;
		}
		const valueEl = child.children.find(
			(item) =>
				item.localName === 'setter.value' || item.localName.endsWith('.value')
		);
		const valueNodes = valueEl ? valueEl.children : child.children;
		if (valueNodes[0]) {
			setters.push({ property, valueNode: valueNodes[0] });
			continue;
		}
		if (child.text.trim()) {
			setters.push({ property, value: child.text.trim() });
		}
	}
	return setters;
}

function resolveStyleSetters(
	styleNode: XmlNode,
	registry: ResourceRegistry,
	seen: Set<string>
): StyleSetter[] {
	const key = getAttr(styleNode, 'Key') ?? '';
	const cycleKey = key
		? `style:${key}`
		: `implicit:${(getAttr(styleNode, 'TargetType') ?? '').toLowerCase()}`;
	if (seen.has(cycleKey)) {
		return [];
	}
	seen.add(cycleKey);

	const merged = new Map<string, StyleSetter>();
	const basedOn = getAttr(styleNode, 'BasedOn');
	if (basedOn) {
		const me = parseMarkupExtension(basedOn);
		if (me) {
			const parent = registry.getStyle(me.key);
			if (parent) {
				for (const setter of resolveStyleSetters(parent, registry, seen)) {
					merged.set(setter.property.toLowerCase(), setter);
				}
			}
		}
	}

	for (const setter of collectSetters(styleNode)) {
		merged.set(setter.property.toLowerCase(), setter);
	}

	return [...merged.values()];
}

function settersToCss(
	setters: StyleSetter[],
	registry: ResourceRegistry,
	colorScheme: ColorScheme = 'dark'
): MappedCss {
	const styles: Record<string, string> = {};
	let horizontal: string | undefined;
	let vertical: string | undefined;

	for (const setter of setters) {
		const resolved =
			setter.value !== undefined
				? resolveRawValue(setter.value, registry, new Set(), colorScheme)
				: setter.valueNode
					? resolveBrushNode(setter.valueNode, registry, new Set(), colorScheme)
					: undefined;
		if (resolved === undefined) {
			continue;
		}
		const mapped = mapPropertyToCss(setter.property.toLowerCase(), resolved);
		Object.assign(styles, mapped.styles);
		if (mapped.horizontal !== undefined) {
			horizontal = mapped.horizontal;
		}
		if (mapped.vertical !== undefined) {
			vertical = mapped.vertical;
		}
	}

	return { styles, horizontal, vertical };
}

/**
 * Resolves Style="{StaticResource Key}" into CSS, following BasedOn and Setters.
 */
export function resolveStyleAttribute(
	styleAttrValue: string,
	ctx: RenderContext,
	line: number
): MappedCss {
	const empty: MappedCss = { styles: {} };
	const me = parseMarkupExtension(styleAttrValue);
	if (!me) {
		return empty;
	}

	const registry = ctx.styleRegistry;
	const styleNode = registry?.getStyle(me.key);
	if (!registry || !styleNode) {
		const known = WELL_KNOWN_TEXT_STYLES[me.key];
		if (known) {
			return { styles: { ...known } };
		}
		ctx.hasUnknown.value = true;
		ctx.output.appendLine(
			`Unknown style resource: [${me.key}] : [${line}]`
		);
		return empty;
	}

	const setters = resolveStyleSetters(styleNode, registry, new Set());
	return settersToCss(setters, registry, colorSchemeOf(ctx));
}

/**
 * Setters from implicit control styles that are safe to apply as CSS.
 * WinUI visual setters (Background, FontFamily, …) belong to ControlTemplates
 * we do not render; applying them strips the preview chrome.
 * MAUI implicit styles (BackgroundColor, TextColor, CornerRadius, …) have no
 * template chrome and must be applied to match the running app.
 */
const IMPLICIT_LAYOUT_PROPS = new Set([
	'horizontalalignment',
	'verticalalignment',
	'horizontaloptions',
	'verticaloptions',
	'width',
	'height',
	'widthrequest',
	'heightrequest',
	'minwidth',
	'minheight',
	'maxwidth',
	'maxheight',
	'margin',
	'backgroundcolor',
	'textcolor',
	'bordercolor',
	'borderwidth',
	'cornerradius',
	'padding',
	'fontsize',
	'fontattributes',
	'minimumwidthrequest',
	'minimumheightrequest',
	'maximumwidthrequest',
	'maximumheightrequest',
]);

/**
 * Applies the implicit Style for a control type (TargetType, no x:Key),
 * e.g. Button → HorizontalAlignment=Left from DefaultButtonStyle.
 */
export function resolveImplicitStyle(
	tagLocalName: string,
	ctx: RenderContext
): MappedCss {
	const empty: MappedCss = { styles: {} };
	const registry = ctx.styleRegistry;
	const styleNode = registry?.getImplicitStyle(tagLocalName);
	if (!registry || !styleNode) {
		return empty;
	}

	const setters = resolveStyleSetters(styleNode, registry, new Set()).filter(
		(setter) => IMPLICIT_LAYOUT_PROPS.has(setter.property.toLowerCase())
	);
	return settersToCss(setters, registry, colorSchemeOf(ctx));
}

/**
 * Applies Avalonia selector styles from Application.Styles / StyleInclude
 * (e.g. `Button`, `TextBlock.title`, `Grid.barraBotoesInferior Button`).
 */
export function resolveSelectorStyles(
	node: XmlNode,
	ctx: RenderContext
): MappedCss {
	const empty: MappedCss = { styles: {} };
	const registry = ctx.styleRegistry;
	if (!registry) {
		return empty;
	}

	const matches = registry.getMatchingSelectorStyles(node);
	if (matches.length === 0) {
		return empty;
	}

	const styles: Record<string, string> = {};
	let horizontal: string | undefined;
	let vertical: string | undefined;
	const scheme = colorSchemeOf(ctx);
	for (const styleNode of matches) {
		const css = settersToCss(
			resolveStyleSetters(styleNode, registry, new Set()),
			registry,
			scheme
		);
		Object.assign(styles, css.styles);
		if (css.horizontal !== undefined) {
			horizontal = css.horizontal;
		}
		if (css.vertical !== undefined) {
			vertical = css.vertical;
		}
	}
	return { styles, horizontal, vertical };
}
