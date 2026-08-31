import { buttonContent } from './buttonContent';
import { processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderDropDownButton(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const text = buttonContent(node, ctx);
	return `<button type="button" data-xaml="DropDownButton"${styleAttr(props.style)}${props.attrs}><span class="dropdown-label">${text}</span><span class="dropdown-chevron">&#8964;</span></button>`;
}
