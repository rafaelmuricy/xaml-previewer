import {
	escapeHtmlText,
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function glyphToChar(glyph: string): string {
	const value = glyph.trim();
	if (!value) {
		return '';
	}

	const entityMatch = value.match(/^&#x([0-9A-Fa-f]+);?$/);
	if (entityMatch) {
		return String.fromCodePoint(Number.parseInt(entityMatch[1], 16));
	}

	const unicodeEscape = value.match(/^\\[uU]([0-9A-Fa-f]+)$/);
	if (unicodeEscape) {
		return String.fromCodePoint(Number.parseInt(unicodeEscape[1], 16));
	}

	if (/^[0-9A-Fa-f]{2,6}$/.test(value)) {
		return String.fromCodePoint(Number.parseInt(value, 16));
	}

	return value;
}

export function renderFontIcon(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const glyph = getAttr(node, 'Glyph') ?? '';
	const char = isMarkupExtension(glyph)
		? ''
		: escapeHtmlText(glyphToChar(glyph));

	const merged = [
		'font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif',
		'display: block',
		'flex-shrink: 0',
		'line-height: 1',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<span data-xaml="FontIcon"${styleAttr(merged)}${props.attrs}>${char}</span>`;
}
