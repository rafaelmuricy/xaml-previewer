import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	inputFillStyle,
	inputHostStyle,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isCollectionWrapper(node: XmlNode): boolean {
	return (
		node.localName === 'array' ||
		node.localName.endsWith('.items') ||
		node.localName.endsWith('.itemssource')
	);
}

function itemLabel(node: XmlNode): string | undefined {
	if (node.localName === 'string') {
		return node.text;
	}
	const content = getAttr(node, 'Content');
	if (content !== undefined) {
		return content;
	}
	return node.text || undefined;
}

function collectItems(node: XmlNode): XmlNode[] {
	const items: XmlNode[] = [];

	const visit = (current: XmlNode): void => {
		if (isCollectionWrapper(current)) {
			for (const child of current.children) {
				visit(child);
			}
			return;
		}
		if (itemLabel(current) !== undefined) {
			items.push(current);
		}
	};

	for (const child of node.children) {
		visit(child);
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

	return undefined;
}

function textAlignCss(raw: string | undefined): string | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	switch (raw.trim().toLowerCase()) {
		case 'start':
		case 'left':
			return 'left';
		case 'center':
			return 'center';
		case 'end':
		case 'right':
			return 'right';
		default:
			return undefined;
	}
}

function placeholderColorCss(raw: string | undefined): string | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const value = raw.trim();
	return value || undefined;
}

export function renderPicker(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const items = collectItems(node);
	const selected = selectedLabel(node, items)?.trim();
	const title = getAttr(node, 'Title')?.trim() ?? '';
	const display = selected || title;
	const valueClass = selected ? 'picker-value' : 'picker-value placeholder';
	const extraStyles: string[] = [];
	const align = textAlignCss(getAttr(node, 'HorizontalTextAlignment'));
	if (align) {
		extraStyles.push(`text-align: ${align}`);
	}
	if (!selected) {
		const titleColor = placeholderColorCss(getAttr(node, 'TitleColor'));
		if (titleColor) {
			extraStyles.push(`color: ${titleColor}`);
		}
	}
	const valueStyle = extraStyles.length
		? ` style="${escapeHtmlAttr(extraStyles.join('; '))}"`
		: '';
	const valueHtml = display
		? `<span class="${valueClass}"${valueStyle}>${escapeHtmlText(display)}</span>`
		: `<span class="picker-value"${valueStyle}></span>`;
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="Picker"${styleAttr(host)}${props.attrs}><div class="picker-field"${styleAttr(fill)}>${valueHtml}<span class="picker-chevron">&#8964;</span></div></div>`;
}
