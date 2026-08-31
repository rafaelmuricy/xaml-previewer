import { processProperties } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderMenuFlyout(node: XmlNode, ctx: RenderContext): string {
	processProperties(node, ctx);
	ctx.renderChildren(node.children);
	return '';
}

export function renderMenuFlyoutItem(node: XmlNode, ctx: RenderContext): string {
	processProperties(node, ctx);
	return '';
}

export function renderMenuFlyoutSeparator(
	node: XmlNode,
	ctx: RenderContext
): string {
	processProperties(node, ctx);
	return '';
}

export function renderFlyoutProperty(node: XmlNode, ctx: RenderContext): string {
	processProperties(node, ctx);
	ctx.renderChildren(node.children);
	return '';
}
