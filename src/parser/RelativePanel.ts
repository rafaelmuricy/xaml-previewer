import {
	getAttr,
	hasCssProperty,
	isCollapsed,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import { resolveImplicitStyle, resolveSelectorStyles } from './styleParser';
import type { RenderContext, XmlNode } from './types';

interface Thickness {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

interface PanelItem {
	node: XmlNode;
	name: string;
	width: number;
	height: number;
	margin: Thickness;
	x: number;
	y: number;
	placedH: boolean;
	placedV: boolean;
	leftOf?: string;
	rightOf?: string;
	above?: string;
	below?: string;
	alignLeftWith?: string;
	alignTopWith?: string;
	alignRightWith?: string;
	alignBottomWith?: string;
	alignHorizontalCenterWith?: string;
	alignVerticalCenterWith?: string;
	alignLeftWithPanel: boolean;
	alignTopWithPanel: boolean;
	alignRightWithPanel: boolean;
	alignBottomWithPanel: boolean;
	alignHorizontalCenterWithPanel: boolean;
	alignVerticalCenterWithPanel: boolean;
}

function isRelativePanelProperty(node: XmlNode): boolean {
	return (
		node.localName.startsWith('relativepanel.') ||
		node.localName.endsWith('.children')
	);
}

function parseNumber(raw: string | undefined): number | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const value = Number.parseFloat(raw.trim());
	return Number.isFinite(value) ? value : undefined;
}

function parseBool(raw: string | undefined): boolean {
	return (raw ?? '').trim().toLowerCase() === 'true';
}

function parseName(raw: string | undefined): string | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const name = raw.trim();
	return name || undefined;
}

function parseThickness(raw: string | undefined): Thickness {
	const empty = { left: 0, top: 0, right: 0, bottom: 0 };
	if (!raw || isMarkupExtension(raw)) {
		return empty;
	}
	const parts = raw.split(',').map((part) => Number.parseFloat(part.trim()));
	if (parts.some((n) => !Number.isFinite(n))) {
		return empty;
	}
	if (parts.length === 1) {
		return { left: parts[0], top: parts[0], right: parts[0], bottom: parts[0] };
	}
	if (parts.length === 2) {
		return { left: parts[0], top: parts[1], right: parts[0], bottom: parts[1] };
	}
	if (parts.length >= 4) {
		return { left: parts[0], top: parts[1], right: parts[2], bottom: parts[3] };
	}
	return empty;
}

function cssPx(styles: Record<string, string>, prop: string): number | undefined {
	const raw = styles[prop];
	if (!raw) {
		return undefined;
	}
	const match = /^([\d.]+)px$/i.exec(raw.trim());
	return match ? Number.parseFloat(match[1]) : undefined;
}

function measureChild(node: XmlNode, ctx: RenderContext): { width: number; height: number } {
	let width = parseNumber(getAttr(node, 'Width'));
	let height = parseNumber(getAttr(node, 'Height'));
	if (width === undefined || height === undefined) {
		const implicit = resolveImplicitStyle(node.localName, ctx);
		const selectors = resolveSelectorStyles(node, ctx);
		width ??= cssPx(selectors.styles, 'width') ?? cssPx(implicit.styles, 'width');
		height ??=
			cssPx(selectors.styles, 'height') ?? cssPx(implicit.styles, 'height');
	}
	return { width: width ?? 0, height: height ?? 0 };
}

function childName(node: XmlNode): string {
	return (getAttr(node, 'Name') ?? '').trim();
}

function collectItem(node: XmlNode, ctx: RenderContext): PanelItem {
	const size = measureChild(node, ctx);
	return {
		node,
		name: childName(node),
		width: size.width,
		height: size.height,
		margin: parseThickness(getAttr(node, 'Margin')),
		x: 0,
		y: 0,
		placedH: false,
		placedV: false,
		leftOf: parseName(getAttr(node, 'RelativePanel.LeftOf')),
		rightOf: parseName(getAttr(node, 'RelativePanel.RightOf')),
		above: parseName(getAttr(node, 'RelativePanel.Above')),
		below: parseName(getAttr(node, 'RelativePanel.Below')),
		alignLeftWith: parseName(getAttr(node, 'RelativePanel.AlignLeftWith')),
		alignTopWith: parseName(getAttr(node, 'RelativePanel.AlignTopWith')),
		alignRightWith: parseName(getAttr(node, 'RelativePanel.AlignRightWith')),
		alignBottomWith: parseName(getAttr(node, 'RelativePanel.AlignBottomWith')),
		alignHorizontalCenterWith: parseName(
			getAttr(node, 'RelativePanel.AlignHorizontalCenterWith')
		),
		alignVerticalCenterWith: parseName(
			getAttr(node, 'RelativePanel.AlignVerticalCenterWith')
		),
		alignLeftWithPanel: parseBool(getAttr(node, 'RelativePanel.AlignLeftWithPanel')),
		alignTopWithPanel: parseBool(getAttr(node, 'RelativePanel.AlignTopWithPanel')),
		alignRightWithPanel: parseBool(getAttr(node, 'RelativePanel.AlignRightWithPanel')),
		alignBottomWithPanel: parseBool(getAttr(node, 'RelativePanel.AlignBottomWithPanel')),
		alignHorizontalCenterWithPanel: parseBool(
			getAttr(node, 'RelativePanel.AlignHorizontalCenterWithPanel')
		),
		alignVerticalCenterWithPanel: parseBool(
			getAttr(node, 'RelativePanel.AlignVerticalCenterWithPanel')
		),
	};
}

function resolveHorizontal(
	item: PanelItem,
	byName: Map<string, PanelItem>,
	panelWidth: number | undefined
): void {
	const target = (name: string | undefined) =>
		name ? byName.get(name.toLowerCase()) : undefined;

	const rightOf = target(item.rightOf);
	if (rightOf?.placedH) {
		item.x = rightOf.x + rightOf.width + item.margin.left;
		item.placedH = true;
		return;
	}
	const leftOf = target(item.leftOf);
	if (leftOf?.placedH) {
		item.x = leftOf.x - item.width - item.margin.right;
		item.placedH = true;
		return;
	}
	const alignLeft = target(item.alignLeftWith);
	if (alignLeft?.placedH) {
		item.x = alignLeft.x + item.margin.left;
		item.placedH = true;
		return;
	}
	const alignRight = target(item.alignRightWith);
	if (alignRight?.placedH) {
		item.x = alignRight.x + alignRight.width - item.width - item.margin.right;
		item.placedH = true;
		return;
	}
	const alignCenter = target(item.alignHorizontalCenterWith);
	if (alignCenter?.placedH) {
		item.x = alignCenter.x + (alignCenter.width - item.width) / 2;
		item.placedH = true;
		return;
	}
	if (item.alignRightWithPanel && panelWidth !== undefined) {
		item.x = panelWidth - item.width - item.margin.right;
		item.placedH = true;
		return;
	}
	if (item.alignHorizontalCenterWithPanel && panelWidth !== undefined) {
		item.x = (panelWidth - item.width) / 2;
		item.placedH = true;
		return;
	}
	if (
		item.alignLeftWithPanel ||
		(!item.leftOf &&
			!item.rightOf &&
			!item.alignLeftWith &&
			!item.alignRightWith &&
			!item.alignHorizontalCenterWith &&
			!item.alignRightWithPanel &&
			!item.alignHorizontalCenterWithPanel)
	) {
		item.x = item.margin.left;
		item.placedH = true;
	}
}

function resolveVertical(
	item: PanelItem,
	byName: Map<string, PanelItem>,
	panelHeight: number | undefined
): void {
	const target = (name: string | undefined) =>
		name ? byName.get(name.toLowerCase()) : undefined;

	const below = target(item.below);
	if (below?.placedV) {
		item.y = below.y + below.height + item.margin.top;
		item.placedV = true;
		return;
	}
	const above = target(item.above);
	if (above?.placedV) {
		item.y = above.y - item.height - item.margin.bottom;
		item.placedV = true;
		return;
	}
	const alignTop = target(item.alignTopWith);
	if (alignTop?.placedV) {
		item.y = alignTop.y + item.margin.top;
		item.placedV = true;
		return;
	}
	const alignBottom = target(item.alignBottomWith);
	if (alignBottom?.placedV) {
		item.y = alignBottom.y + alignBottom.height - item.height - item.margin.bottom;
		item.placedV = true;
		return;
	}
	const alignCenter = target(item.alignVerticalCenterWith);
	if (alignCenter?.placedV) {
		item.y = alignCenter.y + (alignCenter.height - item.height) / 2;
		item.placedV = true;
		return;
	}
	if (item.alignBottomWithPanel && panelHeight !== undefined) {
		item.y = panelHeight - item.height - item.margin.bottom;
		item.placedV = true;
		return;
	}
	if (item.alignVerticalCenterWithPanel && panelHeight !== undefined) {
		item.y = (panelHeight - item.height) / 2;
		item.placedV = true;
		return;
	}
	if (
		item.alignTopWithPanel ||
		(!item.above &&
			!item.below &&
			!item.alignTopWith &&
			!item.alignBottomWith &&
			!item.alignVerticalCenterWith &&
			!item.alignBottomWithPanel &&
			!item.alignVerticalCenterWithPanel)
	) {
		item.y = item.margin.top;
		item.placedV = true;
	}
}

function layoutItems(
	items: PanelItem[],
	panelWidth: number | undefined,
	panelHeight: number | undefined
): void {
	const byName = new Map<string, PanelItem>();
	for (const item of items) {
		if (item.name) {
			byName.set(item.name.toLowerCase(), item);
		}
	}

	const passes = items.length + 2;
	for (let i = 0; i < passes; i++) {
		for (const item of items) {
			if (!item.placedH) {
				resolveHorizontal(item, byName, panelWidth);
			}
			if (!item.placedV) {
				resolveVertical(item, byName, panelHeight);
			}
		}
	}

	for (const item of items) {
		if (!item.placedH) {
			item.x = item.margin.left;
			item.placedH = true;
		}
		if (!item.placedV) {
			item.y = item.margin.top;
			item.placedV = true;
		}
	}
}

function contentExtent(items: PanelItem[], axis: 'x' | 'y'): number {
	let max = 0;
	for (const item of items) {
		const end =
			axis === 'x'
				? item.x + item.width + item.margin.right
				: item.y + item.height + item.margin.bottom;
		if (end > max) {
			max = end;
		}
	}
	return max;
}

export function renderRelativePanel(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const explicitWidth = parseNumber(getAttr(node, 'Width'));
	const explicitHeight = parseNumber(getAttr(node, 'Height'));

	const items = node.children
		.filter((child) => !isRelativePanelProperty(child) && !isCollapsed(child))
		.map((child) => collectItem(child, ctx));

	layoutItems(items, explicitWidth, explicitHeight);
	if (explicitWidth === undefined || explicitHeight === undefined) {
		const measuredWidth = explicitWidth ?? contentExtent(items, 'x');
		const measuredHeight = explicitHeight ?? contentExtent(items, 'y');
		for (const item of items) {
			item.placedH = false;
			item.placedV = false;
		}
		layoutItems(items, measuredWidth, measuredHeight);
	}

	const measuredHeight = explicitHeight ?? contentExtent(items, 'y');
	let itemsHtml = '';
	for (const item of items) {
		const left = item.x - item.margin.left;
		const top = item.y - item.margin.top;
		const pos = [
			'position: absolute',
			`left: ${left}px`,
			`top: ${top}px`,
		].join('; ');
		itemsHtml += `<div${styleAttr(pos)}>${ctx.renderNode(item.node)}</div>`;
	}

	const merged = [
		'position: relative',
		'box-sizing: border-box',
		hasCssProperty(props.style, 'height') ? '' : `height: ${measuredHeight}px`,
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="RelativePanel"${styleAttr(merged)}${props.attrs}>${itemsHtml}</div>`;
}
