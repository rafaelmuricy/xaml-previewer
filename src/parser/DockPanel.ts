import {
	getAttr,
	isCollapsed,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

type DockSide = 'left' | 'top' | 'right' | 'bottom';

function isDockPanelPropertyElement(node: XmlNode): boolean {
	return (
		node.localName.startsWith('dockpanel.') ||
		node.localName.endsWith('.children')
	);
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = raw.trim().toLowerCase();
	if (value === 'true') {
		return true;
	}
	if (value === 'false') {
		return false;
	}
	return fallback;
}

function getDock(node: XmlNode): DockSide {
	const raw = (getAttr(node, 'DockPanel.Dock') ?? 'Left').trim().toLowerCase();
	if (raw === 'top' || raw === 'bottom' || raw === 'right') {
		return raw;
	}
	return 'left';
}

function flexDirection(dock: DockSide): 'row' | 'column' {
	return dock === 'top' || dock === 'bottom' ? 'column' : 'row';
}

function slotStyle(dock: DockSide, fill: boolean): string {
	if (fill) {
		return [
			'flex: 1 1 auto',
			'align-self: stretch',
			'min-width: 0',
			'min-height: 0',
			'display: grid',
			'grid-template-rows: minmax(0, 1fr)',
			'grid-template-columns: minmax(0, 1fr)',
			'box-sizing: border-box',
		].join('; ');
	}

	const vertical = dock === 'top' || dock === 'bottom';
	return [
		'flex: 0 0 auto',
		'align-self: stretch',
		vertical ? 'width: 100%' : 'height: 100%',
		'min-width: 0',
		'min-height: 0',
		'display: grid',
		vertical
			? 'grid-template-columns: minmax(0, 1fr)'
			: 'grid-template-columns: auto',
		vertical
			? 'grid-template-rows: auto'
			: 'grid-template-rows: minmax(0, 1fr)',
		'box-sizing: border-box',
	].join('; ');
}

function remainingStyle(direction: 'row' | 'column'): string {
	return [
		'display: flex',
		`flex-direction: ${direction}`,
		'align-items: stretch',
		'flex: 1 1 auto',
		'align-self: stretch',
		'min-width: 0',
		'min-height: 0',
		'box-sizing: border-box',
	].join('; ');
}

function leftoverStyle(): string {
	return [
		'flex: 1 1 auto',
		'align-self: stretch',
		'min-width: 0',
		'min-height: 0',
	].join('; ');
}

function renderSlot(
	node: XmlNode,
	ctx: RenderContext,
	dock: DockSide,
	fill: boolean
): string {
	return `<div${styleAttr(slotStyle(dock, fill))}>${ctx.renderNode(node)}</div>`;
}

/**
 * Builds nested flex wrappers in document order so each child only sees the
 * rectangle left after earlier siblings — matching WPF DockPanel.
 */
function layoutChildren(
	children: XmlNode[],
	lastChildFill: boolean,
	ctx: RenderContext
): { html: string; direction: 'row' | 'column' } {
	if (children.length === 0) {
		return { html: '', direction: 'column' };
	}

	const [head, ...tail] = children;
	const isLast = tail.length === 0;
	const fill = isLast && lastChildFill;
	const dock = getDock(head);
	const direction = fill ? 'column' : flexDirection(dock);
	const slot = renderSlot(head, ctx, dock, fill);

	if (isLast && fill) {
		return { html: slot, direction };
	}

	if (isLast) {
		const leftover = `<div${styleAttr(leftoverStyle())}></div>`;
		const html =
			dock === 'top' || dock === 'left' ? slot + leftover : leftover + slot;
		return { html, direction };
	}

	const rest = layoutChildren(tail, lastChildFill, ctx);
	const remaining = `<div${styleAttr(remainingStyle(rest.direction))}>${rest.html}</div>`;
	const html =
		dock === 'top' || dock === 'left' ? slot + remaining : remaining + slot;
	return { html, direction };
}

export function renderDockPanel(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const lastChildFill = parseBool(getAttr(node, 'LastChildFill'), true);
	const contentChildren: XmlNode[] = [];

	for (const child of node.children) {
		if (isDockPanelPropertyElement(child)) {
			if (child.localName.endsWith('.children')) {
				contentChildren.push(...child.children);
			}
			continue;
		}
		contentChildren.push(child);
	}

	const visible = contentChildren.filter((child) => !isCollapsed(child));
	const { html, direction } = layoutChildren(visible, lastChildFill, ctx);

	const merged = [
		'display: flex',
		`flex-direction: ${direction}`,
		'align-items: stretch',
		'width: 100%',
		'height: 100%',
		'box-sizing: border-box',
		'min-width: 0',
		'min-height: 0',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="DockPanel"${styleAttr(merged)}${props.attrs}>${html}</div>`;
}
