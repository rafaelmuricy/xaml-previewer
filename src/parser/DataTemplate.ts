import { processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderDataTemplate(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const children = ctx.renderChildren(node.children);
	const merged = ['display: contents', props.style].filter(Boolean).join('; ');
	return `<div data-xaml="DataTemplate"${styleAttr(merged)}${props.attrs}>${children}</div>`;
}
