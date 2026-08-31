import {
	IMAGE_PLACEHOLDER_SVG,
	imageObjectFit,
	resolveImageUrl,
} from './Image';
import {
	escapeHtmlAttr,
	getAttr,
	hasCssProperty,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderImageButton(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const src = resolveImageUrl(ctx, getAttr(node, 'Source'));
	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 64px',
		hasCssProperty(props.style, 'height') ? '' : 'height: 64px',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const inner = src
		? `<img src="${escapeHtmlAttr(src)}" alt="" style="object-fit: ${imageObjectFit(node)}" />`
		: IMAGE_PLACEHOLDER_SVG;

	return `<button type="button" data-xaml="ImageButton"${src ? '' : ' class="placeholder"'}${styleAttr(merged)}${props.attrs}>${inner}</button>`;
}
