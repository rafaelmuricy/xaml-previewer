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
		return 0;
	}
	const index = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(index) && index >= 0 ? index : 0;
}

function isFlipViewProperty(node: XmlNode, suffix: string): boolean {
	const lower = node.localName;
	return (
		lower === `flipview.${suffix}` ||
		lower === suffix ||
		lower.endsWith(`.${suffix}`)
	);
}

function hasVerticalOrientation(node: XmlNode): boolean {
	const orientation = getAttr(node, 'Orientation');
	if (orientation && orientation.toLowerCase() === 'vertical') {
		return true;
	}
	return node.children.some(hasVerticalOrientation);
}

function renderPage(node: XmlNode, ctx: RenderContext): string {
	if (node.localName === 'flipviewitem') {
		return renderFlipViewItem(node, ctx);
	}
	if (node.localName === 'string') {
		return `<div data-xaml="FlipViewItem">${escapeHtmlText(node.text)}</div>`;
	}
	return ctx.renderNode(node);
}

export function renderFlipViewItem(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const content = getAttr(node, 'Content');
	const children = ctx.renderChildren(node.children);
	const inner =
		content !== undefined
			? escapeHtmlText(content)
			: node.text
				? escapeHtmlText(node.text)
				: children;
	return `<div data-xaml="FlipViewItem"${styleAttr(props.style)}${props.attrs}>${inner}</div>`;
}

export function renderFlipView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const items: XmlNode[] = [];
	let itemTemplate: XmlNode | undefined;
	let itemsPanel: XmlNode | undefined;
	let nestedItems: XmlNode | undefined;

	for (const child of node.children) {
		if (isFlipViewProperty(child, 'itemtemplate')) {
			itemTemplate = child;
			continue;
		}
		if (isFlipViewProperty(child, 'itemspanel')) {
			itemsPanel = child;
			continue;
		}
		if (isFlipViewProperty(child, 'items')) {
			nestedItems = child;
			continue;
		}
		items.push(child);
	}

	const pages = nestedItems ? nestedItems.children : items;
	if (itemTemplate) {
		processProperties(itemTemplate, ctx);
	}

	const selected = Math.min(
		parseIndex(getAttr(node, 'SelectedIndex')),
		Math.max(pages.length - 1, 0)
	);
	const page = pages[selected];
	const inner = page
		? renderPage(page, ctx)
		: itemTemplate
			? ctx.renderChildren(itemTemplate.children)
			: '';

	const vertical = itemsPanel ? hasVerticalOrientation(itemsPanel) : false;
	const orientation = vertical ? 'vertical' : 'horizontal';
	const showNav = Boolean(inner);

	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		'box-sizing: border-box',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const nav = showNav
		? '<span class="flip-nav flip-prev"></span><span class="flip-nav flip-next"></span>'
		: '';

	return `<div data-xaml="FlipView" class="${orientation}"${styleAttr(merged)}${props.attrs}><div class="flip-page">${inner}</div>${nav}</div>`;
}
