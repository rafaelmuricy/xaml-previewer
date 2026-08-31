import {
	getAttr,
	hasCssProperty,
	isCollapsed,
	isMarkupExtension,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isWrapPanelPropertyElement(node: XmlNode): boolean {
	return (
		node.localName.startsWith('wrappanel.') ||
		node.localName.endsWith('.children')
	);
}

function itemSize(raw: string | undefined): string | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const trimmed = raw.trim();
	if (!trimmed || /^nan$/i.test(trimmed) || /^auto$/i.test(trimmed)) {
		return undefined;
	}
	return toCssLength(trimmed);
}

function wrapAlign(horizontal: string | undefined): 'start' | 'center' | 'end' {
	const align = (horizontal ?? 'center').toLowerCase();
	if (align === 'left' || align === 'start') {
		return 'start';
	}
	if (align === 'right' || align === 'end') {
		return 'end';
	}
	return 'center';
}

function packJustify(align: 'start' | 'center' | 'end'): string {
	return align === 'start'
		? 'flex-start'
		: align === 'end'
			? 'flex-end'
			: 'center';
}

export function renderWrapPanel(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const orientation = (
		getAttr(node, 'Orientation') ?? 'Horizontal'
	).toLowerCase();
	const vertical = orientation === 'vertical';
	const itemWidth = itemSize(getAttr(node, 'ItemWidth'));
	const itemHeight = itemSize(getAttr(node, 'ItemHeight'));

	const align = wrapAlign(getAttr(node, 'HorizontalAlignment'));
	const pack = packJustify(align);
	const autoSize = !vertical;
	const extraAttrs = [
		itemWidth ? ' data-item-width=""' : '',
		itemHeight ? ' data-item-height=""' : '',
		` data-wrap-align="${align}"`,
		autoSize ? ' data-wrap-autosize=""' : '',
	].join('');

	const merged = [
		'display: flex',
		`flex-direction: ${vertical ? 'column' : 'row'}`,
		vertical ? 'flex-wrap: wrap' : 'flex-wrap: nowrap',
		`justify-content: ${vertical ? 'flex-start' : pack}`,
		vertical ? `align-content: ${pack}` : 'align-items: flex-start',
		vertical ? 'align-items: flex-start' : '',
		'box-sizing: border-box',
		'min-width: 0',
		'min-height: 0',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		vertical && !hasCssProperty(props.style, 'height') ? 'height: 100%' : '',
		itemWidth ? `--wrap-item-width: ${itemWidth}` : '',
		itemHeight ? `--wrap-item-height: ${itemHeight}` : '',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const innerStyle = [
		'display: flex',
		'flex-direction: row',
		'flex-wrap: wrap',
		'justify-content: flex-start',
		'align-items: flex-start',
		'align-content: flex-start',
		'box-sizing: border-box',
		'position: relative',
		'width: max-content',
		'max-width: 100%',
		'min-width: 0',
		'margin-left: auto',
		'margin-right: auto',
	].join('; ');

	const contentChildren: XmlNode[] = [];
	for (const child of node.children) {
		if (isWrapPanelPropertyElement(child)) {
			if (child.localName.endsWith('.children')) {
				contentChildren.push(...child.children);
			}
			continue;
		}
		contentChildren.push(child);
	}

	const children = contentChildren
		.filter((child) => !isCollapsed(child))
		.map((child) => ctx.renderNode(child))
		.join('');

	const content = vertical
		? children
		: `<div data-wrap-inner=""${styleAttr(innerStyle)}>${children}</div>`;

	return `<div data-xaml="WrapPanel"${styleAttr(merged)}${props.attrs}${extraAttrs}>${content}</div>`;
}
