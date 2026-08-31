import {
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isListViewPropertyElement(node: XmlNode, suffix: string): boolean {
	const lower = node.localName;
	return (
		lower === `listview.${suffix}` ||
		lower === suffix ||
		lower.endsWith(`.${suffix}`)
	);
}

function parseIndex(raw: string | undefined): number {
	if (!raw || isMarkupExtension(raw)) {
		return -1;
	}
	const index = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(index) ? index : -1;
}

export function renderListViewItem(
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
	return `<div data-xaml="ListViewItem"${cls}${styleAttr(props.style)}${props.attrs}>${text}</div>`;
}

export function renderListView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const selectedIndex = parseIndex(getAttr(node, 'SelectedIndex'));
	const selectionMode = (getAttr(node, 'SelectionMode') ?? 'single').toLowerCase();
	const showSelection = selectionMode !== 'none';

	let headerNode: XmlNode | undefined;
	let itemTemplate: XmlNode | undefined;
	const items: XmlNode[] = [];

	for (const child of node.children) {
		if (isListViewPropertyElement(child, 'header')) {
			headerNode = child;
			continue;
		}
		if (isListViewPropertyElement(child, 'itemtemplate')) {
			itemTemplate = child;
			continue;
		}
		if (isListViewPropertyElement(child, 'items')) {
			items.push(...child.children);
			continue;
		}
		items.push(child);
	}

	let headerBlock = '';
	if (headerNode) {
		headerBlock = `<div class="list-header">${ctx.renderChildren(headerNode.children)}</div>`;
	} else {
		const headerText = getAttr(node, 'Header')?.trim();
		if (headerText) {
			headerBlock = `<span class="list-header">${escapeHtmlText(headerText)}</span>`;
		}
	}

	const bodyParts: string[] = [];
	if (itemTemplate) {
		const templateProps = processProperties(itemTemplate, ctx);
		bodyParts.push(
			`<div data-xaml="ListView.ItemTemplate"${styleAttr(templateProps.style)}${templateProps.attrs}>${ctx.renderChildren(itemTemplate.children)}</div>`
		);
	}

	items.forEach((item, index) => {
		const selected = showSelection && index === selectedIndex;
		if (item.localName === 'listviewitem' || item.localName === 'string') {
			if (item.localName === 'string') {
				const cls = selected ? ' class="selected"' : '';
				bodyParts.push(
					`<div data-xaml="ListViewItem"${cls}>${escapeHtmlText(item.text)}</div>`
				);
				return;
			}
			bodyParts.push(renderListViewItem(item, ctx, selected));
			return;
		}
		const inner = ctx.renderNode(item);
		if (!inner) {
			return;
		}
		const cls = selected ? ' class="selected"' : '';
		bodyParts.push(`<div data-xaml="ListViewItem"${cls}>${inner}</div>`);
	});

	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="ListView"${styleAttr(merged)}${props.attrs}>${headerBlock}<div class="list-items">${bodyParts.join('')}</div></div>`;
}
