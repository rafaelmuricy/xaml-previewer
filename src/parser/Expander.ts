import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isTrue(raw: string | undefined, fallback: boolean): boolean {
	if (raw === undefined) {
		return fallback;
	}
	return raw.trim().toLowerCase() === 'true';
}

function isHeaderProperty(node: XmlNode): boolean {
	return (
		node.localName === 'expander.header' ||
		node.localName === 'header' ||
		node.localName.endsWith('.header')
	);
}

function contentAlign(raw: string | undefined): string {
	switch ((raw ?? 'Left').toLowerCase()) {
		case 'center':
			return 'center';
		case 'right':
			return 'flex-end';
		case 'stretch':
			return 'stretch';
		default:
			return 'flex-start';
	}
}

export function renderExpander(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const expanded = isTrue(getAttr(node, 'IsExpanded'), false);
	let headerNode: XmlNode | undefined;
	const contentChildren: XmlNode[] = [];
	for (const child of node.children) {
		if (isHeaderProperty(child)) {
			headerNode = child;
			continue;
		}
		contentChildren.push(child);
	}

	const headerAttr = getAttr(node, 'Header')?.trim();
	const headerInner = headerNode
		? ctx.renderChildren(headerNode.children)
		: headerAttr
			? escapeHtmlText(headerAttr)
			: '';
	const chevron = expanded ? '&#8963;' : '&#8964;';
	const content = ctx.renderChildren(contentChildren);
	const align = contentAlign(getAttr(node, 'HorizontalContentAlignment'));
	const cls = expanded ? ' class="expanded"' : '';
	const contentStyle = `align-items: ${align}`;

	return `<div data-xaml="Expander"${cls}${styleAttr(props.style)}${props.attrs}><div class="expander-header"><span class="expander-header-text">${headerInner}</span><span class="expander-chevron">${chevron}</span></div>${expanded ? `<div class="expander-content"${styleAttr(contentStyle)}>${content}</div>` : ''}</div>`;
}
