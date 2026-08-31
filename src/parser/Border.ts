import { mapPropertyToCss } from './cssMapping';
import {
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isBorderPropertyElement(node: XmlNode): boolean {
	return (
		node.localName.startsWith('border.') || node.localName === 'resources'
	);
}

function strokeShapeValueFromChildren(node: XmlNode): string | undefined {
	for (const child of node.children) {
		if (
			child.localName !== 'border.strokeshape' &&
			child.localName !== 'strokeshape'
		) {
			continue;
		}
		if (child.text.trim()) {
			return child.text.trim();
		}
		const shape = child.children[0];
		if (!shape) {
			continue;
		}
		if (shape.localName === 'roundrectangle') {
			const radius = getAttr(shape, 'CornerRadius');
			return radius ? `RoundRectangle ${radius}` : 'RoundRectangle';
		}
		if (shape.localName === 'ellipse') {
			return 'Ellipse';
		}
		if (shape.localName === 'rectangle') {
			return 'Rectangle';
		}
	}
	return undefined;
}

export function renderBorder(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const stroke = getAttr(node, 'Stroke');
	const strokeThickness = getAttr(node, 'StrokeThickness');

	let shapeStyle = '';
	if (!getAttr(node, 'StrokeShape')) {
		const shapeValue = strokeShapeValueFromChildren(node);
		if (shapeValue) {
			const mapped = mapPropertyToCss('strokeshape', shapeValue);
			shapeStyle = Object.entries(mapped.styles)
				.map(([k, v]) => `${k}: ${v}`)
				.join('; ');
		}
	}

	const hasRadius =
		hasCssProperty(props.style, 'border-radius') ||
		hasCssProperty(shapeStyle, 'border-radius');

	const merged = [
		'box-sizing: border-box',
		'min-width: 0',
		'min-height: 0',
		'display: grid',
		'grid-template-rows: minmax(0, 1fr)',
		'grid-template-columns: minmax(0, 1fr)',
		hasRadius ? 'overflow: hidden' : '',
		stroke && !strokeThickness ? 'border-width: 1px' : '',
		shapeStyle,
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const children = ctx.renderChildren(
		node.children.filter((child) => !isBorderPropertyElement(child))
	);
	const text = node.text ? escapeHtmlText(node.text) : '';
	return `<div data-xaml="Border"${styleAttr(merged)}${props.attrs}>${text}${children}</div>`;
}
