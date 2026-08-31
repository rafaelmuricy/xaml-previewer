import { getAttr, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderEllipse(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const stroke = getAttr(node, 'Stroke');
	const strokeThickness = getAttr(node, 'StrokeThickness');

	const merged = [
		'display: block',
		'box-sizing: border-box',
		'flex-shrink: 0',
		'border-radius: 50%',
		'overflow: hidden',
		stroke && !strokeThickness ? 'border-width: 1px' : '',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const children = ctx.renderChildren(node.children);
	return `<div data-xaml="Ellipse"${styleAttr(merged)}${props.attrs}>${children}</div>`;
}
