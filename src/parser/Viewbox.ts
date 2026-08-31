import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function stretchValue(raw: string | undefined): string {
	switch ((raw ?? 'Uniform').trim().toLowerCase()) {
		case 'none':
			return 'none';
		case 'fill':
			return 'fill';
		case 'uniformtofill':
			return 'uniformtofill';
		default:
			return 'uniform';
	}
}

function stretchDirectionValue(raw: string | undefined): string {
	switch ((raw ?? 'Both').trim().toLowerCase()) {
		case 'uponly':
			return 'uponly';
		case 'downonly':
			return 'downonly';
		default:
			return 'both';
	}
}

function renderContent(node: XmlNode, ctx: RenderContext): string {
	const parts: string[] = [];
	if (node.text) {
		parts.push(escapeHtmlText(node.text));
	}

	for (const child of node.children) {
		if (child.localName.startsWith('viewbox.')) {
			processProperties(child, ctx);
			parts.push(ctx.renderChildren(child.children));
			continue;
		}
		parts.push(ctx.renderNode(child));
	}

	return parts.join('');
}

export function renderViewbox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const stretch = stretchValue(getAttr(node, 'Stretch'));
	const stretchDirection = stretchDirectionValue(
		getAttr(node, 'StretchDirection')
	);
	const merged = [
		'overflow: hidden',
		'box-sizing: border-box',
		'display: flex',
		'align-items: center',
		'justify-content: center',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		hasCssProperty(props.style, 'height') ? '' : 'height: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const extra = [
		` data-stretch="${escapeHtmlAttr(stretch)}"`,
		` data-stretch-direction="${escapeHtmlAttr(stretchDirection)}"`,
	].join('');

	return `<div data-xaml="Viewbox"${styleAttr(merged)}${props.attrs}${extra}><div class="viewbox-content">${renderContent(node, ctx)}</div></div>`;
}
