import {
	getAttr,
	isCollapsed,
	isMarkupExtension,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isCanvasPropertyElement(node: XmlNode): boolean {
	return (
		node.localName.startsWith('canvas.') || node.localName.endsWith('.children')
	);
}

function canvasLength(node: XmlNode, name: string): string | undefined {
	const raw = getAttr(node, name);
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	return toCssLength(raw);
}

function canvasZIndex(node: XmlNode): number | undefined {
	const raw = getAttr(node, 'Canvas.ZIndex');
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const value = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(value) ? value : undefined;
}

export function renderCanvas(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	let itemsHtml = '';

	for (const child of node.children) {
		if (isCanvasPropertyElement(child)) {
			continue;
		}
		if (isCollapsed(child)) {
			continue;
		}

		const left = canvasLength(child, 'Canvas.Left');
		const top = canvasLength(child, 'Canvas.Top');
		const right = canvasLength(child, 'Canvas.Right');
		const bottom = canvasLength(child, 'Canvas.Bottom');
		const zIndex = canvasZIndex(child);
		const pos = [
			'position: absolute',
			left !== undefined
				? `left: ${left}`
				: right === undefined
					? 'left: 0'
					: '',
			top !== undefined
				? `top: ${top}`
				: bottom === undefined
					? 'top: 0'
					: '',
			right !== undefined ? `right: ${right}` : '',
			bottom !== undefined ? `bottom: ${bottom}` : '',
			zIndex !== undefined ? `z-index: ${zIndex}` : '',
		]
			.filter(Boolean)
			.join('; ');

		itemsHtml += `<div${styleAttr(pos)}>${ctx.renderNode(child)}</div>`;
	}

	const merged = [
		'position: relative',
		'overflow: hidden',
		'box-sizing: border-box',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="Canvas"${styleAttr(merged)}${props.attrs}>${itemsHtml}</div>`;
}
