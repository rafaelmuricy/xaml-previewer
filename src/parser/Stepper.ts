import { processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderStepper(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	return `<div data-xaml="Stepper"${styleAttr(props.style)}${props.attrs}><span class="stepper-btn stepper-minus">&#8722;</span><span class="stepper-divider"></span><span class="stepper-btn stepper-plus">+</span></div>`;
}
