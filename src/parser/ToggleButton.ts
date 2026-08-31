import { escapeHtmlText, getAttr, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderToggleButton(node: XmlNode, ctx: RenderContext): string {
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
	const cls = isChecked ? ' class="checked"' : '';
	return `<button type="button" data-xaml="ToggleButton"${cls}${styleAttr(props.style)}${props.attrs}>${text}</button>`;
}
