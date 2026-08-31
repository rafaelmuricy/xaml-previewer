import { escapeHtmlText, getAttr, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderButton(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const content = getAttr(node, 'Content') ?? getAttr(node, 'Text');
	const children = ctx.renderChildren(node.children);
	const text =
		content !== undefined
			? escapeHtmlText(content)
			: node.text
				? escapeHtmlText(node.text)
				: children;
	return `<button type="button" data-xaml="Button"${styleAttr(props.style)}${props.attrs}>${text}</button>`;
}
