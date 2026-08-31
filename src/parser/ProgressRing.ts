import { getAttr, processProperties, styleAttr } from './properties';
import { resolveRawValue } from './styleParser';
import type { RenderContext, XmlNode } from './types';

function resolveAccent(
	raw: string | undefined,
	ctx: RenderContext
): string | undefined {
	if (!raw?.trim()) {
		return undefined;
	}
	return resolveRawValue(
		raw,
		ctx.styleRegistry,
		new Set(),
		ctx.colorScheme ?? 'dark'
	);
}

export function renderProgressRing(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const isActive = (
		getAttr(node, 'IsRunning') ??
		getAttr(node, 'IsActive') ??
		'True'
	).toLowerCase();
	const animate = isActive !== 'false';
	const accent =
		resolveAccent(getAttr(node, 'Color'), ctx) ??
		resolveAccent(getAttr(node, 'Foreground'), ctx);

	const merged = [
		props.style,
		accent ? `border-top-color: ${accent}` : '',
		!animate ? 'animation: none' : '',
	]
		.filter(Boolean)
		.join('; ');

	return `<div class="spinner" data-xaml="${node.tagName}" role="status" aria-label="Loading"${styleAttr(merged)}${props.attrs}></div>`;
}

export const renderActivityIndicator = renderProgressRing;
