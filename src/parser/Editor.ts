import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderEditor(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const placeholder = getAttr(node, 'Placeholder');
	const rawText = getAttr(node, 'Text') ?? '';
	const isReadOnly = (getAttr(node, 'IsReadOnly') ?? '').toLowerCase() === 'true';
	const displayPlaceholder = placeholder || (isReadOnly ? rawText : undefined);
	const text = displayPlaceholder ? '' : rawText;
	const placeholderAttr = displayPlaceholder
		? ` placeholder="${escapeHtmlAttr(displayPlaceholder)}"`
		: '';
	const hasWidth = hasCssProperty(props.style, 'width');
	const host = [
		inputHostStyle(props.style),
		hasWidth ? '' : 'width: 100%',
		hasWidth ? '' : 'align-self: stretch',
	]
		.filter(Boolean)
		.join('; ');
	const fill = [
		inputFillStyle(props.style),
		hasWidth ? '' : 'width: 100%',
		hasWidth ? '' : 'align-self: stretch',
	]
		.filter(Boolean)
		.join('; ');
	return `<div data-xaml="Editor"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<textarea spellcheck="false" rows="4"${placeholderAttr}${styleAttr(fill)}>${escapeHtmlText(text)}</textarea></div>`;
}
