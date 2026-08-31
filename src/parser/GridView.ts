import {
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function parseIndex(raw: string | undefined): number {
	if (!raw || isMarkupExtension(raw)) {
		return -1;
	}
	const index = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(index) ? index : -1;
}

function isGridViewProperty(node: XmlNode, suffix: string): boolean {
	return (
		node.localName === `gridview.${suffix}` ||
		node.localName === suffix ||
		node.localName.endsWith(`.${suffix}`)
	);
}

export function renderGridViewItem(
	node: XmlNode,
	ctx: RenderContext,
	selected = false
): string {
	const props = processProperties(node, ctx);
	const isSelected =
		selected || (getAttr(node, 'IsSelected') ?? '').toLowerCase() === 'true';
	const content = getAttr(node, 'Content');
	const children = ctx.renderChildren(node.children);
	const text =
		content !== undefined
			? escapeHtmlText(content)
			: node.text
				? escapeHtmlText(node.text)
				: children;
	const cls = isSelected ? ' class="selected"' : '';
	return `<div data-xaml="GridViewItem"${cls}${styleAttr(props.style)}${props.attrs}>${text}</div>`;
}

export function renderGridView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const selectedIndex = parseIndex(getAttr(node, 'SelectedIndex'));
	const selectionMode = (getAttr(node, 'SelectionMode') ?? 'single').toLowerCase();
	const showSelection = selectionMode !== 'none';
	const items: XmlNode[] = [];
	let headerNode: XmlNode | undefined;

	for (const child of node.children) {
		if (isGridViewProperty(child, 'header')) {
			headerNode = child;
			continue;
		}
		if (isGridViewProperty(child, 'items')) {
			items.push(...child.children);
			continue;
		}
		items.push(child);
	}

	let headerBlock = '';
	if (headerNode) {
		headerBlock = `<div class="grid-header">${ctx.renderChildren(headerNode.children)}</div>`;
	} else {
		const headerText = getAttr(node, 'Header')?.trim();
		if (headerText) {
			headerBlock = `<span class="grid-header">${escapeHtmlText(headerText)}</span>`;
		}
	}

	const body = items
		.map((item, index) => {
			const selected = showSelection && index === selectedIndex;
			if (item.localName === 'gridviewitem') {
				return renderGridViewItem(item, ctx, selected);
			}
			if (item.localName === 'string') {
				const cls = selected ? ' class="selected"' : '';
				return `<div data-xaml="GridViewItem"${cls}>${escapeHtmlText(item.text)}</div>`;
			}
			const inner = ctx.renderNode(item);
			if (!inner) {
				return '';
			}
			const cls = selected ? ' class="selected"' : '';
			return `<div data-xaml="GridViewItem"${cls}>${inner}</div>`;
		})
		.join('');

	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="GridView"${styleAttr(merged)}${props.attrs}>${headerBlock}<div class="grid-items">${body}</div></div>`;
}
