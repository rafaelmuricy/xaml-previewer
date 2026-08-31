import {
	escapeHtmlAttr,
	getAttr,
	hasCssProperty,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import { resolveRawValue } from './styleParser';
import type { RenderContext, XmlNode } from './types';

function parseNumber(raw: string | undefined, fallback: number): number {
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = Number(raw.trim());
	return Number.isFinite(value) ? value : fallback;
}

function resolveColor(
	raw: string | undefined,
	ctx: RenderContext
): string | undefined {
	if (!raw?.trim()) {
		return undefined;
	}
	return resolveRawValue(
		raw,
		ctx.styleRegistry,
		new Set(),
		ctx.colorScheme ?? 'dark'
	);
}

function mapLineCap(raw: string | undefined): string {
	switch ((raw ?? '').toLowerCase()) {
		case 'round':
			return 'round';
		case 'square':
		case 'triangle':
			return 'square';
		default:
			return 'butt';
	}
}

function mapLineJoin(raw: string | undefined): string | undefined {
	switch ((raw ?? '').toLowerCase()) {
		case 'round':
			return 'round';
		case 'bevel':
			return 'bevel';
		case 'miter':
			return 'miter';
		default:
			return undefined;
	}
}

function mapDashArray(raw: string | undefined): string | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const parts = raw
		.split(/[\s,]+/)
		.map((part) => part.trim())
		.filter(Boolean);
	return parts.length ? parts.join(' ') : undefined;
}

function withoutBorderStyles(style: string): string {
	return style
		.split(';')
		.map((part) => part.trim())
		.filter((part) => {
			const name = part.split(':')[0]?.trim().toLowerCase();
			return Boolean(name) && !name.startsWith('border');
		})
		.join('; ');
}

export function renderLine(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const x1 = parseNumber(getAttr(node, 'X1'), 0);
	const y1 = parseNumber(getAttr(node, 'Y1'), 0);
	const x2 = parseNumber(getAttr(node, 'X2'), 0);
	const y2 = parseNumber(getAttr(node, 'Y2'), 0);
	const thickness = parseNumber(getAttr(node, 'StrokeThickness'), 1);
	const stroke = resolveColor(getAttr(node, 'Stroke'), ctx) ?? 'currentColor';
	const lineCap = mapLineCap(getAttr(node, 'StrokeLineCap'));
	const lineJoin = mapLineJoin(getAttr(node, 'StrokeLineJoin'));
	const dashArray = mapDashArray(getAttr(node, 'StrokeDashArray'));
	const dashOffsetRaw = getAttr(node, 'StrokeDashOffset');
	const dashOffset =
		dashOffsetRaw && !isMarkupExtension(dashOffsetRaw)
			? parseNumber(dashOffsetRaw, NaN)
			: NaN;

	const width = parseNumber(
		getAttr(node, 'WidthRequest') ?? getAttr(node, 'Width'),
		Math.max(x1, x2, 1)
	);
	const height = parseNumber(
		getAttr(node, 'HeightRequest') ?? getAttr(node, 'Height'),
		Math.max(y1, y2, 1)
	);

	const lineAttrs = [
		`x1="${x1}"`,
		`y1="${y1}"`,
		`x2="${x2}"`,
		`y2="${y2}"`,
		'fill="none"',
		`stroke="${escapeHtmlAttr(stroke)}"`,
		`stroke-width="${thickness}"`,
		`stroke-linecap="${lineCap}"`,
		lineJoin ? `stroke-linejoin="${lineJoin}"` : '',
		dashArray ? `stroke-dasharray="${escapeHtmlAttr(dashArray)}"` : '',
		Number.isFinite(dashOffset)
			? `stroke-dashoffset="${dashOffset}"`
			: '',
	]
		.filter(Boolean)
		.join(' ');

	const merged = [
		'display: block',
		'flex-shrink: 0',
		'overflow: visible',
		hasCssProperty(props.style, 'width') ? '' : `width: ${width}px`,
		hasCssProperty(props.style, 'height') ? '' : `height: ${height}px`,
		withoutBorderStyles(props.style),
	]
		.filter(Boolean)
		.join('; ');

	return `<svg data-xaml="Line" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none"${styleAttr(merged)}${props.attrs}><line ${lineAttrs} /></svg>`;
}
