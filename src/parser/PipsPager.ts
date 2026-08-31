import {
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function parseCount(raw: string | undefined, fallback: number): number {
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function renderPipsPager(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const pages = parseCount(getAttr(node, 'NumberOfPages'), 0);
	const maxVisible = parseCount(getAttr(node, 'MaxVisiblePips'), 5);
	const selected = parseCount(getAttr(node, 'SelectedPageIndex'), 0);
	const count = Math.min(pages, maxVisible);
	const pips = Array.from({ length: count }, (_, index) => {
		const cls = index === selected ? 'pip selected' : 'pip';
		return `<span class="${cls}"></span>`;
	}).join('');

	const merged = [
		'display: flex',
		'flex-direction: row',
		'align-items: center',
		'justify-content: center',
		'box-sizing: border-box',
		props.style,
		'width: 100%',
	]
		.filter(Boolean)
		.join('; ');
	return `<div data-xaml="PipsPager"${styleAttr(merged)}${props.attrs}>${pips}</div>`;
}
