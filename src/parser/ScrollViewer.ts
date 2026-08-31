import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function scrollModeToOverflow(value: string | undefined): string {
	return (value ?? '').toLowerCase() === 'disabled' ? 'hidden' : 'auto';
}

function cssPropertyValue(style: string, prop: string): string | undefined {
	const match = new RegExp(`(?:^|;\\s*)${prop}\\s*:\\s*([^;]+)`, 'i').exec(
		style
	);
	const value = match?.[1]?.trim();
	return value || undefined;
}

export function renderScrollViewer(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const overflowX = scrollModeToOverflow(getAttr(node, 'HorizontalScrollMode'));
	const overflowY = scrollModeToOverflow(getAttr(node, 'VerticalScrollMode'));
	const padding = cssPropertyValue(props.style, 'padding');
	const merged = [
		`overflow-x: ${overflowX}`,
		`overflow-y: ${overflowY}`,
		'box-sizing: border-box',
		'height: 100%',
		'width: 100%',
		props.style,
		padding ? 'padding: 0' : '',
	]
		.filter(Boolean)
		.join('; ');
	const children = ctx.renderChildren(node.children);
	const text = node.text ? escapeHtmlText(node.text) : '';
	const content = padding
		? `<div${styleAttr(`box-sizing: border-box; width: 100%; min-height: 100%; padding: ${padding}`)}>${text}${children}</div>`
		: `${text}${children}`;
	return `<div data-xaml="${node.tagName}"${styleAttr(merged)}${props.attrs}>${content}</div>`;
}
