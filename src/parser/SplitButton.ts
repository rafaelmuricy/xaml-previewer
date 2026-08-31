import { buttonContent } from './buttonContent';
import { processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderSplitButton(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const text = buttonContent(node, ctx);
	return `<div data-xaml="SplitButton"${styleAttr(props.style)}${props.attrs}><span class="split-main">${text}</span><span class="split-divider"></span><span class="split-chevron">&#8964;</span></div>`;
}
