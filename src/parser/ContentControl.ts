import { hasCssProperty, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderContentControl(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const merged = [
		'display: flex',
		'align-items: center',
		'justify-content: center',
		'box-sizing: border-box',
		'min-width: 0',
		'min-height: 0',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		hasCssProperty(props.style, 'height') ? '' : 'height: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');
	return `<div data-xaml="ContentControl"${styleAttr(merged)}${props.attrs}>ContentControl</div>`;
}
