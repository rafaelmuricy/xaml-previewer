import { toCssLength } from './cssMapping';
import {
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import { resolveRawValue } from './styleParser';
import type { RenderContext, XmlNode } from './types';

const PREVIEW_COUNT = 3;
const DEFAULT_SIZE = 6;

function parseCount(raw: string | undefined, fallback: number): number {
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function isFalse(raw: string | undefined): boolean {
	return (raw ?? '').toLowerCase() === 'false';
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

function resolveSize(raw: string | undefined): string {
	if (!raw || isMarkupExtension(raw)) {
		return `${DEFAULT_SIZE}px`;
	}
	return toCssLength(raw) ?? `${DEFAULT_SIZE}px`;
}

export function renderIndicatorView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const count = parseCount(getAttr(node, 'Count'), PREVIEW_COUNT);
	const maxVisible = parseCount(getAttr(node, 'MaximumVisible'), count);
	const visible = Math.min(count, maxVisible);
	const hideSingle = !isFalse(getAttr(node, 'HideSingle'));
	const selected = Math.min(
		parseCount(getAttr(node, 'Position'), 0),
		Math.max(visible - 1, 0)
	);
	const indicatorColor = resolveColor(getAttr(node, 'IndicatorColor'), ctx);
	const selectedColor = resolveColor(
		getAttr(node, 'SelectedIndicatorColor'),
		ctx
	);
	const size = resolveSize(getAttr(node, 'IndicatorSize'));
	const square =
		(getAttr(node, 'IndicatorsShape') ?? '').toLowerCase() === 'square';

	if (visible <= 0 || (hideSingle && visible === 1)) {
		const hidden = [
			'display: none',
			props.style,
		]
			.filter(Boolean)
			.join('; ');
		return `<div data-xaml="IndicatorView"${styleAttr(hidden)}${props.attrs}></div>`;
	}

	const dots = Array.from({ length: visible }, (_, index) => {
		const isSelected = index === selected;
		const fill = isSelected ? selectedColor : indicatorColor;
		const cls = isSelected ? 'indicator selected' : 'indicator';
		const dotStyle = [
			`width: ${size}`,
			`height: ${size}`,
			fill ? `background: ${fill}` : '',
		]
			.filter(Boolean)
			.join('; ');
		return `<span class="${cls}"${styleAttr(dotStyle)}></span>`;
	}).join('');

	const merged = [
		'display: flex',
		'flex-direction: row',
		'align-items: center',
		'justify-content: center',
		'box-sizing: border-box',
		'gap: 8px',
		selectedColor ? `--selected-indicator-color: ${selectedColor}` : '',
		indicatorColor ? `--indicator-color: ${indicatorColor}` : '',
		props.style,
	]
		.filter(Boolean)
		.join('; ');
	const classAttr = square ? ' class="square"' : '';
	return `<div data-xaml="IndicatorView"${classAttr}${styleAttr(merged)}${props.attrs}>${dots}</div>`;
}
