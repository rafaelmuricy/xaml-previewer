import {
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isListBoxPropertyElement(node: XmlNode, suffix: string): boolean {
	const lower = node.localName;
	return (
		lower === `listbox.${suffix}` ||
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

function itemContent(node: XmlNode, ctx: RenderContext): string {
	const content = getAttr(node, 'Content');
	if (content !== undefined) {
		return escapeHtmlText(content);
	}

	const others: XmlNode[] = [];
	for (const child of node.children) {
		if (isListBoxPropertyElement(child, 'content')) {
			if (child.text) {
				return escapeHtmlText(child.text);
			}
			return ctx.renderChildren(child.children);
		}
		others.push(child);
	}

	if (node.text) {
		return escapeHtmlText(node.text);
	}
	return ctx.renderChildren(others);
}

export function renderListBoxItem(
	node: XmlNode,
	ctx: RenderContext,
	selected = false
): string {
	const props = processProperties(node, ctx);
	const isSelected =
		selected || (getAttr(node, 'IsSelected') ?? '').toLowerCase() === 'true';
	const cls = isSelected ? ' class="selected"' : '';
	return `<div data-xaml="ListBoxItem"${cls}${styleAttr(props.style)}${props.attrs}>${itemContent(node, ctx)}</div>`;
}

export function renderListBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const selectedIndex = parseIndex(getAttr(node, 'SelectedIndex'));
	const selectionMode = (getAttr(node, 'SelectionMode') ?? 'single').toLowerCase();
	const showSelection = selectionMode !== 'none';

	const items: XmlNode[] = [];
	for (const child of node.children) {
		if (isListBoxPropertyElement(child, 'items')) {
			items.push(...child.children);
			continue;
		}
		if (isListBoxPropertyElement(child, 'itemtemplate')) {
			continue;
		}
		items.push(child);
	}

	const body = items
		.map((item, index) => {
			const selected = showSelection && index === selectedIndex;
			if (item.localName === 'listboxitem') {
				return renderListBoxItem(item, ctx, selected);
			}
			if (item.localName === 'string') {
				const cls = selected ? ' class="selected"' : '';
				return `<div data-xaml="ListBoxItem"${cls}>${escapeHtmlText(item.text)}</div>`;
			}
			const inner = ctx.renderNode(item);
			if (!inner) {
				return '';
			}
			const cls = selected ? ' class="selected"' : '';
			return `<div data-xaml="ListBoxItem"${cls}>${inner}</div>`;
		})
		.join('');

	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="ListBox"${styleAttr(merged)}${props.attrs}><div class="list-items">${body}</div></div>`;
}
