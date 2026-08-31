import {
	escapeHtmlText,
	getAttr,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isItemsProperty(node: XmlNode): boolean {
	return (
		node.localName === 'combobox.items' || node.localName.endsWith('.items')
	);
}

function itemLabel(node: XmlNode): string | undefined {
	if (node.localName === 'string') {
		return node.text;
	}
	if (node.localName === 'comboboxitem') {
		return getAttr(node, 'Content') ?? node.text;
	}
	return undefined;
}

function collectItems(node: XmlNode): XmlNode[] {
	const items: XmlNode[] = [];
	for (const child of node.children) {
		if (isItemsProperty(child)) {
			items.push(...collectItems(child));
			continue;
		}
		if (itemLabel(child) !== undefined) {
			items.push(child);
		}
	}
	return items;
}

function selectedLabel(node: XmlNode, items: XmlNode[]): string | undefined {
	const rawIndex = getAttr(node, 'SelectedIndex');
	if (rawIndex !== undefined && !isMarkupExtension(rawIndex)) {
		const index = Number.parseInt(rawIndex.trim(), 10);
		if (Number.isInteger(index) && index >= 0 && index < items.length) {
			return itemLabel(items[index]);
		}
	}

	const selectedItem = getAttr(node, 'SelectedItem');
	if (selectedItem && !isMarkupExtension(selectedItem)) {
		const match = items.find((item) => itemLabel(item) === selectedItem);
		if (match) {
			return itemLabel(match);
		}
		return selectedItem;
	}

	const marked = items.find(
		(item) => (getAttr(item, 'IsSelected') ?? '').toLowerCase() === 'true'
	);
	return marked ? itemLabel(marked) : undefined;
}

export function renderComboBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const items = collectItems(node);
	const selected = selectedLabel(node, items)?.trim();
	const placeholder = getAttr(node, 'PlaceholderText') ?? '';
	const display = selected || placeholder;
	const valueClass = selected ? 'combo-value' : 'combo-value placeholder';
	const valueHtml = display
		? `<span class="${valueClass}">${escapeHtmlText(display)}</span>`
		: '<span class="combo-value"></span>';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="ComboBox"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="combo-field"${styleAttr(fill)}>${valueHtml}<span class="combo-chevron">&#8964;</span></div></div>`;
}
