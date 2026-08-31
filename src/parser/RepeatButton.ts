import { buttonContent } from './buttonContent';
import { processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderRepeatButton(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const text = buttonContent(node, ctx);
	return `<button type="button" data-xaml="RepeatButton"${styleAttr(props.style)}${props.attrs}>${text}</button>`;
}
