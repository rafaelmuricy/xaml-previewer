import {
	escapeHtmlAttr,
	getAttr,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderAutoSuggestBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const text = getAttr(node, 'Text') ?? '';
	const placeholder = getAttr(node, 'PlaceholderText');
	const valueAttr = text ? ` value="${escapeHtmlAttr(text)}"` : '';
	const placeholderAttr = placeholder
		? ` placeholder="${escapeHtmlAttr(placeholder)}"`
		: '';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="AutoSuggestBox"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<input type="text"${valueAttr}${placeholderAttr}${styleAttr(fill)} /></div>`;
}
