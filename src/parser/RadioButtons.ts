import {
	escapeHtmlText,
	getAttr,
	headerHtml,
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

function parseColumns(raw: string | undefined): number {
	if (!raw || isMarkupExtension(raw)) {
		return 1;
	}
	const value = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(value) && value > 0 ? value : 1;
}

function itemLabel(node: XmlNode): string | undefined {
	if (node.localName === 'string') {
		return node.text;
	}
	if (node.localName === 'radiobutton') {
		return getAttr(node, 'Content') ?? node.text;
	}
	return undefined;
}

export function renderRadioButtons(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const selectedIndex = parseIndex(getAttr(node, 'SelectedIndex'));
	const columns = parseColumns(getAttr(node, 'MaxColumns'));
	const items: XmlNode[] = [];

	for (const child of node.children) {
		if (
			child.localName === 'radiobuttons.items' ||
			child.localName.endsWith('.items')
		) {
			items.push(...child.children);
			continue;
		}
		items.push(child);
	}

	const radios = items
		.map((item, index) => {
			const label = itemLabel(item);
			if (label === undefined && item.localName !== 'radiobutton') {
				const inner = ctx.renderNode(item);
				return inner;
			}
			const checked =
				index === selectedIndex ||
				(getAttr(item, 'IsChecked') ?? '').toLowerCase() === 'true';
			if (item.localName === 'radiobutton') {
				const itemProps = processProperties(item, ctx);
				const markClass = checked ? 'radio-mark checked' : 'radio-mark';
				const text = escapeHtmlText(label ?? '');
				const contentHtml = text
					? `<span class="radio-content">${text}</span>`
					: '';
				return `<div data-xaml="RadioButton"${styleAttr(itemProps.style)}${itemProps.attrs}><span class="${markClass}"></span>${contentHtml}</div>`;
			}
			const markClass = checked ? 'radio-mark checked' : 'radio-mark';
			return `<div data-xaml="RadioButton"><span class="${markClass}"></span><span class="radio-content">${escapeHtmlText(label ?? '')}</span></div>`;
		})
		.join('');

	const gridStyle = `grid-template-columns: repeat(${columns}, max-content)`;
	return `<div data-xaml="RadioButtons"${styleAttr(props.style)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="radio-items"${styleAttr(gridStyle)}>${radios}</div></div>`;
}
