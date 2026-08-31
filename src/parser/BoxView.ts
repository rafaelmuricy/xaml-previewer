import { getAttr, hasCssProperty, processProperties, styleAttr } from './properties';
import { resolveRawValue } from './styleParser';
import type { RenderContext, XmlNode } from './types';

export function renderBoxView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const fill = resolveRawValue(
		getAttr(node, 'Color') ?? '',
		ctx.styleRegistry,
		new Set(),
		ctx.colorScheme ?? 'dark'
	);
	const merged = [
		'display: block',
		'box-sizing: border-box',
		'flex-shrink: 0',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		hasCssProperty(props.style, 'height') ? '' : 'height: 100%',
		fill ? `background-color: ${fill}` : '',
		props.style,
	]
		.filter(Boolean)
		.join('; ');
	return `<div data-xaml="BoxView"${styleAttr(merged)}${props.attrs}></div>`;
}
