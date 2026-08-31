import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderMenuBarItem(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const title = getAttr(node, 'Title') ?? '';
	ctx.renderChildren(node.children);
	return `<div data-xaml="MenuBarItem"${styleAttr(props.style)}${props.attrs}>${escapeHtmlText(title)}</div>`;
}

export function renderMenuBar(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	return `<div data-xaml="MenuBar"${styleAttr(props.style)}${props.attrs}>${ctx.renderChildren(node.children)}</div>`;
}
