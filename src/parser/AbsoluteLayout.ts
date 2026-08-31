import {
	getAttr,
	hasCssProperty,
	isCollapsed,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

const FLAG_X = 1;
const FLAG_Y = 2;
const FLAG_WIDTH = 4;
const FLAG_HEIGHT = 8;

interface LayoutBounds {
	x: number;
	y: number;
	width: number | 'auto';
	height: number | 'auto';
}

function isLayoutPropertyElement(node: XmlNode): boolean {
	return (
		node.localName.startsWith('absolutelayout.') ||
		node.localName.endsWith('.children')
	);
}

function parseCoord(raw: string | undefined, fallback: number): number {
	if (!raw) {
		return fallback;
	}
	const value = Number(raw.trim());
	return Number.isFinite(value) ? value : fallback;
}

function parseSize(raw: string | undefined): number | 'auto' {
	if (!raw) {
		return 'auto';
	}
	const trimmed = raw.trim();
	if (!trimmed || /^auto$/i.test(trimmed) || trimmed === '-1') {
		return 'auto';
	}
	const value = Number(trimmed);
	return Number.isFinite(value) ? value : 'auto';
}

function parseBounds(raw: string | undefined): LayoutBounds {
	if (!raw || isMarkupExtension(raw)) {
		return { x: 0, y: 0, width: 'auto', height: 'auto' };
	}
	const parts = raw.split(',').map((part) => part.trim());
	return {
		x: parseCoord(parts[0], 0),
		y: parseCoord(parts[1], 0),
		width: parseSize(parts[2]),
		height: parseSize(parts[3]),
	};
}

function parseFlags(raw: string | undefined): number {
	if (!raw || isMarkupExtension(raw)) {
		return 0;
	}
	let flags = 0;
	for (const part of raw.toLowerCase().split(/[\s,|]+/).filter(Boolean)) {
		switch (part) {
			case 'none':
				break;
			case 'xproportional':
				flags |= FLAG_X;
				break;
			case 'yproportional':
				flags |= FLAG_Y;
				break;
			case 'widthproportional':
				flags |= FLAG_WIDTH;
				break;
			case 'heightproportional':
				flags |= FLAG_HEIGHT;
				break;
			case 'positionproportional':
				flags |= FLAG_X | FLAG_Y;
				break;
			case 'sizeproportional':
				flags |= FLAG_WIDTH | FLAG_HEIGHT;
				break;
			case 'all':
				flags |= FLAG_X | FLAG_Y | FLAG_WIDTH | FLAG_HEIGHT;
				break;
		}
	}
	return flags;
}

function percent(value: number): string {
	return `${value * 100}%`;
}

function childPositionStyle(node: XmlNode): string {
	const bounds = parseBounds(getAttr(node, 'AbsoluteLayout.LayoutBounds'));
	const flags = parseFlags(getAttr(node, 'AbsoluteLayout.LayoutFlags'));
	const xProp = (flags & FLAG_X) !== 0;
	const yProp = (flags & FLAG_Y) !== 0;
	const wProp = (flags & FLAG_WIDTH) !== 0;
	const hProp = (flags & FLAG_HEIGHT) !== 0;

	const styles = ['position: absolute', 'box-sizing: border-box'];

	if (bounds.width !== 'auto') {
		styles.push(`width: ${wProp ? percent(bounds.width) : `${bounds.width}px`}`);
	}
	if (bounds.height !== 'auto') {
		styles.push(
			`height: ${hProp ? percent(bounds.height) : `${bounds.height}px`}`
		);
	}

	styles.push(`left: ${xProp ? percent(bounds.x) : `${bounds.x}px`}`);
	styles.push(`top: ${yProp ? percent(bounds.y) : `${bounds.y}px`}`);

	if (xProp || yProp) {
		const tx = xProp ? `-${percent(bounds.x)}` : '0';
		const ty = yProp ? `-${percent(bounds.y)}` : '0';
		styles.push(`transform: translate(${tx}, ${ty})`);
	}

	return styles.join('; ');
}

export function renderAbsoluteLayout(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	let itemsHtml = '';

	for (const child of node.children) {
		if (isLayoutPropertyElement(child)) {
			continue;
		}
		if (isCollapsed(child)) {
			continue;
		}
		itemsHtml += `<div${styleAttr(childPositionStyle(child))}>${ctx.renderNode(child)}</div>`;
	}

	const merged = [
		'position: relative',
		'overflow: hidden',
		'box-sizing: border-box',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="AbsoluteLayout"${styleAttr(merged)}${props.attrs}>${itemsHtml}</div>`;
}
