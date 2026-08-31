import {
	escapeHtmlText,
	getAttr,
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

function isTrue(raw: string | undefined, fallback: boolean): boolean {
	if (raw === undefined) {
		return fallback;
	}
	return raw.trim().toLowerCase() === 'true';
}

function isTabViewProperty(node: XmlNode, suffix: string): boolean {
	return (
		node.localName === `tabview.${suffix}` ||
		node.localName.endsWith(`.${suffix}`)
	);
}

export function renderTabViewItem(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const header = getAttr(node, 'Header') ?? '';
	const selected = isTrue(getAttr(node, 'IsSelected'), false);
	ctx.renderChildren(node.children);
	const cls = selected ? ' class="selected"' : '';
	return `<div data-xaml="TabViewItem"${cls}${styleAttr(props.style)}${props.attrs}><span class="tab-header">${escapeHtmlText(header)}</span><span class="tab-close">&#10005;</span></div>`;
}

export function renderTabView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const selectedIndex = parseIndex(getAttr(node, 'SelectedIndex'));
	const showAdd = isTrue(getAttr(node, 'IsAddTabButtonVisible'), true);
	const items: XmlNode[] = [];

	for (const child of node.children) {
		if (isTabViewProperty(child, 'tabitems')) {
			items.push(...child.children);
			continue;
		}
		if (child.localName === 'tabviewitem') {
			items.push(child);
		} else {
			processProperties(child, ctx);
			ctx.renderChildren(child.children);
		}
	}

	let selected = selectedIndex;
	if (selected < 0) {
		selected = items.findIndex(
			(item) => (getAttr(item, 'IsSelected') ?? '').toLowerCase() === 'true'
		);
	}
	if (selected < 0) {
		selected = 0;
	}

	const tabs = items
		.map((item, index) => {
			const itemProps = processProperties(item, ctx);
			const header = getAttr(item, 'Header') ?? '';
			const cls = index === selected ? ' class="selected"' : '';
			return `<div data-xaml="TabViewItem"${cls}${styleAttr(itemProps.style)}${itemProps.attrs}><span class="tab-header">${escapeHtmlText(header)}</span><span class="tab-close">&#10005;</span></div>`;
		})
		.join('');

	const add = showAdd ? '<span class="tab-add">+</span>' : '';
	const selectedItem = items[selected];
	const content = selectedItem ? ctx.renderChildren(selectedItem.children) : '';

	return `<div data-xaml="TabView"${styleAttr(props.style)}${props.attrs}><div class="tab-strip">${tabs}${add}</div><div class="tab-content">${content}</div></div>`;
}
