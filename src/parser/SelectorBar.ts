import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

const SYMBOL_SVG: Record<string, string> = {
	setting:
		'<svg class="selector-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.1" /><path d="M8 2.25l.7 1.35 1.5-.35.85 1.3 1.45.55-.15 1.5 1.15 1.05L12.7 9.1l.15 1.5-1.45.55-.85 1.3-1.5-.35L8 13.75l-.7-1.35-1.5.35-.85-1.3-1.45-.55.15-1.5L2.5 8.35 3.3 6.9l-.15-1.5 1.45-.55.85-1.3 1.5.35L8 2.25z" /></svg>',
	permissions:
		'<svg class="selector-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.4" cy="8" r="2.35" /><path d="M7.7 8h5.1v1.7M10.7 8v2.1" /></svg>',
	help: '<svg class="selector-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6" /><path d="M6.45 6.35a1.7 1.7 0 112.15 2.05c-.55.35-.85.75-.85 1.35" /><circle cx="8" cy="11.7" r="0.55" fill="currentColor" stroke="none" /></svg>',
};

function iconHtml(icon: string | undefined): string {
	if (!icon) {
		return '';
	}
	return SYMBOL_SVG[icon.trim().toLowerCase()] ?? '';
}

export function renderSelectorBarItem(
	node: XmlNode,
	ctx: RenderContext,
	selected = false
): string {
	const props = processProperties(node, ctx);
	const isSelected =
		selected || (getAttr(node, 'IsSelected') ?? '').toLowerCase() === 'true';
	const text = getAttr(node, 'Text') ?? '';
	const icon = iconHtml(getAttr(node, 'Icon'));
	const cls = isSelected ? ' class="selected"' : '';
	return `<div data-xaml="SelectorBarItem"${cls}${styleAttr(props.style)}${props.attrs}>${icon}<span class="selector-label">${escapeHtmlText(text)}</span></div>`;
}

export function renderSelectorBar(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const items = node.children
		.filter((child) => child.localName === 'selectorbaritem')
		.map((child) => renderSelectorBarItem(child, ctx))
		.join('');
	return `<div data-xaml="SelectorBar"${styleAttr(props.style)}${props.attrs}>${items}</div>`;
}
