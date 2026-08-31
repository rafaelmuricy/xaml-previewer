import {
	getAttr,
	hasCssProperty,
	headerHtml,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function parseNumber(raw: string | undefined, fallback: number): number {
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = Number(raw.trim());
	return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
	if (max <= min) {
		return min;
	}
	return Math.min(max, Math.max(min, value));
}

function toPercent(value: number, min: number, max: number): number {
	if (max <= min) {
		return 0;
	}
	return ((clamp(value, min, max) - min) / (max - min)) * 100;
}

function tickPercents(min: number, max: number, frequency: number): number[] {
	if (!(frequency > 0) || max <= min) {
		return [];
	}
	const range = max - min;
	if (range / frequency > 200) {
		return [0, 100];
	}
	const percents: number[] = [];
	for (let value = min; value <= max + frequency * 1e-9; value += frequency) {
		percents.push(toPercent(value, min, max));
	}
	const last = percents[percents.length - 1];
	if (last === undefined || last < 99.9) {
		percents.push(100);
	}
	return percents;
}

function ticksHtml(percents: number[], side: string): string {
	const marks = percents
		.map((pct) => `<span class="slider-tick" style="left: ${pct}%"></span>`)
		.join('');
	return `<div class="slider-ticks ${side}">${marks}</div>`;
}

export function renderSlider(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const min = parseNumber(getAttr(node, 'Minimum'), 0);
	const max = parseNumber(getAttr(node, 'Maximum'), 100);
	const value = parseNumber(getAttr(node, 'Value'), 0);
	const tickFrequency = parseNumber(getAttr(node, 'TickFrequency'), 0);
	const placement = (getAttr(node, 'TickPlacement') ?? 'inline').toLowerCase();
	const percent = toPercent(value, min, max);
	const percents = tickPercents(min, max, tickFrequency);

	const showTop =
		placement === 'outside' ||
		placement === 'topleft' ||
		placement === 'top' ||
		placement === 'left';
	const showBottom =
		placement === 'outside' ||
		placement === 'bottomright' ||
		placement === 'bottom' ||
		placement === 'right';
	const showInline = placement === 'inline' && percents.length > 0;

	const topTicks = showTop && percents.length ? ticksHtml(percents, 'top') : '';
	const bottomTicks =
		showBottom && percents.length ? ticksHtml(percents, 'bottom') : '';
	const inlineTicks = showInline
		? percents
				.map(
					(pct) =>
						`<span class="slider-tick inline" style="left: ${pct}%"></span>`
				)
				.join('')
		: '';

	const merged = [
		'display: flex',
		'flex-direction: column',
		'gap: 8px',
		'min-width: 0',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="Slider"${styleAttr(merged)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="slider-body">${topTicks}<div class="slider-track-wrap"><div class="slider-track"><div class="slider-fill" style="width: ${percent}%"></div>${inlineTicks}</div><span class="slider-thumb" style="left: ${percent}%"></span></div>${bottomTicks}</div></div>`;
}
