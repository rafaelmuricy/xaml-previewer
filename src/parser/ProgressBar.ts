import {
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

function parseProgress(raw: string | undefined): number | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const value = Number(raw.trim());
	if (!Number.isFinite(value)) {
		return undefined;
	}
	return Math.min(1, Math.max(0, value));
}

function isTrue(raw: string | undefined): boolean {
	return (raw ?? '').toLowerCase() === 'true';
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

export function renderProgressBar(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const min = parseNumber(getAttr(node, 'Minimum'), 0);
	const max = parseNumber(getAttr(node, 'Maximum'), 100);
	const value = parseNumber(getAttr(node, 'Value'), 0);
	const progress = parseProgress(getAttr(node, 'Progress'));
	const indeterminate = isTrue(getAttr(node, 'IsIndeterminate'));
	const showError = isTrue(getAttr(node, 'ShowError'));
	const showPaused = isTrue(getAttr(node, 'ShowPaused'));
	const range = max - min;
	const percent = indeterminate
		? 0
		: progress !== undefined
			? progress * 100
			: range > 0
				? Math.min(100, Math.max(0, ((value - min) / range) * 100))
				: 0;
	const modeClass = indeterminate ? ' indeterminate' : '';
	const stateClass = showError ? ' error' : showPaused ? ' paused' : '';
	const classes = `${modeClass}${stateClass}`.trim();
	const classAttr = classes ? ` class="${classes}"` : '';
	const fillColor =
		resolveColor(getAttr(node, 'ProgressColor'), ctx) ??
		resolveColor(getAttr(node, 'Foreground'), ctx);
	const fillStyle = [
		indeterminate ? '' : `width: ${percent}%`,
		!showError && !showPaused && fillColor ? `background: ${fillColor}` : '',
	]
		.filter(Boolean)
		.join('; ');
	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		hasCssProperty(props.style, 'height') ? '' : 'height: 4px',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="ProgressBar"${classAttr} role="progressbar"${styleAttr(merged)}${props.attrs}><div class="progress-track"><div class="progress-fill"${styleAttr(fillStyle)}></div></div></div>`;
}
