import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderTextBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const placeholder = getAttr(node, 'PlaceholderText');
	const rawText = getAttr(node, 'Text') ?? '';
	const isReadOnly = (getAttr(node, 'IsReadOnly') ?? '').toLowerCase() === 'true';
	const displayPlaceholder = placeholder || (isReadOnly ? rawText : undefined);
	const text = displayPlaceholder ? '' : rawText;
	const placeholderAttr = displayPlaceholder
		? ` placeholder="${escapeHtmlAttr(displayPlaceholder)}"`
		: '';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="TextBox"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<textarea spellcheck="false" rows="1"${placeholderAttr}${styleAttr(fill)}>${escapeHtmlText(text)}</textarea></div>`;
}
