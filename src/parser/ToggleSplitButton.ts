import { buttonContent } from './buttonContent';
import { getAttr, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderToggleSplitButton(
	node: XmlNode,
	ctx: RenderContext
): string {
	const props = processProperties(node, ctx);
	const isChecked = (getAttr(node, 'IsChecked') ?? '').toLowerCase() === 'true';
	const text = buttonContent(node, ctx);
	const cls = isChecked ? ' class="checked"' : '';
	return `<div data-xaml="ToggleSplitButton"${cls}${styleAttr(props.style)}${props.attrs}><span class="split-main">${text}</span><span class="split-divider"></span><span class="split-chevron">&#8964;</span></div>`;
}
