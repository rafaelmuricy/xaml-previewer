import {
	getAttr,
	hasCssProperty,
	isCollapsed,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isLayoutPropertyElement(node: XmlNode): boolean {
	return (
		node.localName.startsWith('flexlayout.') ||
		node.localName.endsWith('.children')
	);
}

function mapDirection(raw: string | undefined): string {
	switch ((raw ?? '').toLowerCase()) {
		case 'column':
			return 'column';
		case 'rowreverse':
			return 'row-reverse';
		case 'columnreverse':
			return 'column-reverse';
		default:
			return 'row';
	}
}

function mapWrap(raw: string | undefined): string {
	switch ((raw ?? '').toLowerCase()) {
		case 'wrap':
			return 'wrap';
		case 'reverse':
			return 'wrap-reverse';
		default:
			return 'nowrap';
	}
}

function mapJustify(raw: string | undefined): string {
	switch ((raw ?? '').toLowerCase()) {
		case 'center':
			return 'center';
		case 'end':
			return 'flex-end';
		case 'spacebetween':
			return 'space-between';
		case 'spacearound':
			return 'space-around';
		case 'spaceevenly':
			return 'space-evenly';
		default:
			return 'flex-start';
	}
}

function mapAlignItems(raw: string | undefined): string {
	switch ((raw ?? '').toLowerCase()) {
		case 'start':
			return 'flex-start';
		case 'center':
			return 'center';
		case 'end':
			return 'flex-end';
		default:
			return 'stretch';
	}
}

function mapAlignContent(raw: string | undefined): string {
	switch ((raw ?? '').toLowerCase()) {
		case 'start':
			return 'flex-start';
		case 'center':
			return 'center';
		case 'end':
			return 'flex-end';
		case 'spacebetween':
			return 'space-between';
		case 'spacearound':
			return 'space-around';
		case 'spaceevenly':
			return 'space-evenly';
		default:
			return 'stretch';
	}
}

export function renderFlexLayout(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const direction = mapDirection(getAttr(node, 'Direction'));
	const wrap = mapWrap(getAttr(node, 'Wrap'));
	const justify = mapJustify(getAttr(node, 'JustifyContent'));
	const alignItems = mapAlignItems(getAttr(node, 'AlignItems'));
	const alignContentRaw = getAttr(node, 'AlignContent');
	const alignContent =
		alignContentRaw && !isMarkupExtension(alignContentRaw)
			? mapAlignContent(alignContentRaw)
			: undefined;

	const merged = [
		'display: flex',
		`flex-direction: ${direction}`,
		`flex-wrap: ${wrap}`,
		`justify-content: ${justify}`,
		`align-items: ${alignItems}`,
		alignContent ? `align-content: ${alignContent}` : '',
		'box-sizing: border-box',
		'min-width: 0',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const children = node.children
		.filter((child) => !isLayoutPropertyElement(child) && !isCollapsed(child))
		.map((child) => ctx.renderNode(child))
		.join('');

	return `<div data-xaml="FlexLayout"${styleAttr(merged)}${props.attrs}>${children}</div>`;
}
