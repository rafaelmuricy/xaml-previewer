import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderRadioButton(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const isChecked = (getAttr(node, 'IsChecked') ?? '').toLowerCase() === 'true';
	const content = getAttr(node, 'Content');
	const children = ctx.renderChildren(node.children);
	const text =
		content !== undefined
			? escapeHtmlText(content)
			: node.text
				? escapeHtmlText(node.text)
				: children;
	const markClass = isChecked ? 'radio-mark checked' : 'radio-mark';
	const contentHtml = text
		? `<span class="radio-content">${text}</span>`
		: '';

	return `<div data-xaml="RadioButton"${styleAttr(props.style)}${props.attrs}><span class="${markClass}"></span>${contentHtml}</div>`;
}
