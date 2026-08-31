import { processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderUserControl(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const children = ctx.renderChildren(node.children);
	const merged = [
		'width: 100%',
		'height: 100%',
		'box-sizing: border-box',
		props.style,
	]
		.filter(Boolean)
		.join('; ');
	return `<div class="xaml-root" data-xaml="UserControl"${styleAttr(merged)}${props.attrs}>${children}</div>`;
}
