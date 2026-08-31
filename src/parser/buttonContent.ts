import { escapeHtmlText, getAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function isFlyoutProperty(node: XmlNode): boolean {
	return node.localName === 'flyout' || node.localName.endsWith('.flyout');
}

export function buttonContent(node: XmlNode, ctx: RenderContext): string {
	const flyouts: XmlNode[] = [];
	const others: XmlNode[] = [];
	for (const child of node.children) {
		if (isFlyoutProperty(child)) {
			flyouts.push(child);
			continue;
		}
		others.push(child);
	}
	ctx.renderChildren(flyouts);

	const content = getAttr(node, 'Content') ?? getAttr(node, 'Text');
	if (content !== undefined) {
		return escapeHtmlText(content);
	}
	if (node.text) {
		return escapeHtmlText(node.text);
	}
	return ctx.renderChildren(others);
}
