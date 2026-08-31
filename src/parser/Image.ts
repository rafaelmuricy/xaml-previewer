import {
	escapeHtmlAttr,
	getAttr,
	hasCssProperty,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function stretchToObjectFit(stretch: string | undefined): string {
	switch ((stretch ?? 'Uniform').toLowerCase()) {
		case 'fill':
			return 'fill';
		case 'aspectfill':
		case 'uniformtofill':
			return 'cover';
		case 'none':
			return 'none';
		default:
			return 'contain';
	}
}

export function imageObjectFit(node: XmlNode): string {
	return stretchToObjectFit(imageFitValue(node));
}

function imageFitValue(node: XmlNode): string | undefined {
	const aspect = getAttr(node, 'Aspect');
	if (aspect && !isMarkupExtension(aspect)) {
		return aspect;
	}
	const stretch = getAttr(node, 'Stretch');
	if (stretch && !isMarkupExtension(stretch)) {
		return stretch;
	}
	return undefined;
}

export function resolveImageUrl(
	ctx: RenderContext,
	source: string | undefined
): string | undefined {
	if (!source || isMarkupExtension(source)) {
		return undefined;
	}
	const trimmed = source.trim();
	if (!trimmed) {
		return undefined;
	}
	if (/^(https?:|data:)/i.test(trimmed)) {
		return trimmed;
	}
	return ctx.resolveImageSrc?.(trimmed);
}

export const IMAGE_PLACEHOLDER_SVG =
	'<svg class="image-placeholder-mark" viewBox="0 0 64 64" aria-hidden="true"><line x1="4" y1="4" x2="60" y2="60" /><line x1="60" y1="4" x2="4" y2="60" /><circle cx="32" cy="32" r="10" /></svg>';

export function renderImage(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const src = resolveImageUrl(ctx, getAttr(node, 'Source'));
	if (src) {
		const fit = imageObjectFit(node);
		const merged = [
			'display: block',
			`object-fit: ${fit}`,
			props.style,
		]
			.filter(Boolean)
			.join('; ');
		return `<img data-xaml="Image" src="${escapeHtmlAttr(src)}" alt=""${styleAttr(merged)}${props.attrs} />`;
	}

	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 64px',
		hasCssProperty(props.style, 'height') ? '' : 'height: 64px',
		props.style,
	]
		.filter(Boolean)
		.join('; ');
	return `<div data-xaml="Image" class="placeholder"${styleAttr(merged)}${props.attrs}>${IMAGE_PLACEHOLDER_SVG}</div>`;
}
