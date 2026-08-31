import {
	getAttr,
	hasCssProperty,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderRectangle(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const stroke = getAttr(node, 'Stroke');
	const strokeThickness = getAttr(node, 'StrokeThickness');
	const radiusX = toCssLength(getAttr(node, 'RadiusX') ?? '');
	const radiusY = toCssLength(getAttr(node, 'RadiusY') ?? '');
	let radius = '';
	if (radiusX && radiusY) {
		radius = `border-radius: ${radiusX} / ${radiusY}`;
	} else if (radiusX || radiusY) {
		radius = `border-radius: ${radiusX ?? radiusY}`;
	}

	if (!hasCssProperty(props.style, 'height')) {
		return '';
	}

	const merged = [
		'display: block',
		'box-sizing: border-box',
		'flex-shrink: 0',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		stroke && !strokeThickness ? 'border-width: 1px' : '',
		radius,
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const children = ctx.renderChildren(node.children);
	return `<div data-xaml="Rectangle"${styleAttr(merged)}${props.attrs}>${children}</div>`;
}
