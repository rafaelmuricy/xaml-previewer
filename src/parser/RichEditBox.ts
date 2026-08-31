import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	headerHtml,
	inputHostStyle,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderRichEditBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const text = getAttr(node, 'Text') ?? '';
	const placeholder = getAttr(node, 'PlaceholderText');
	const placeholderAttr = placeholder
		? ` placeholder="${escapeHtmlAttr(placeholder)}"`
		: '';
	const host = [
		inputHostStyle(props.style),
		props.style,
		'width: 100%',
		'align-self: stretch',
	]
		.filter(Boolean)
		.join('; ');
	const fill = [
		'flex: 1 1 auto',
		'align-self: stretch',
		'width: 100%',
		'height: 100%',
		'min-width: 0',
		'min-height: 0',
		'box-sizing: border-box',
		'margin: 0',
	].join('; ');
	return `<div data-xaml="RichEditBox"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<textarea spellcheck="false" rows="4"${placeholderAttr}${styleAttr(fill)}>${escapeHtmlText(text)}</textarea></div>`;
}
