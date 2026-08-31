import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

const SYMBOL_SVG: Record<string, string> = {
	save: '<svg class="appbar-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.25 2.25h7.6L13.75 5.15V13.75H3.25V2.25z" /><path d="M5.25 2.25v3.5h5.5v-3.5" /><path d="M5.25 9.25h5.5v4.5h-5.5z" /></svg>',
	edit: '<svg class="appbar-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M11.2 2.35l2.45 2.45L5.4 13.05H2.95v-2.45L11.2 2.35z" /><path d="M9.85 3.7l2.45 2.45" /></svg>',
	share: '<svg class="appbar-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7" /><path d="M5.25 5L8 2.25 10.75 5" /><path d="M3.25 8.25v5.5h9.5v-5.5" /></svg>',
	setting:
		'<svg class="appbar-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.1" /><path d="M8 2.25l.7 1.35 1.5-.35.85 1.3 1.45.55-.15 1.5 1.15 1.05L12.7 9.1l.15 1.5-1.45.55-.85 1.3-1.5-.35L8 13.75l-.7-1.35-1.5.35-.85-1.3-1.45-.55.15-1.5L2.5 8.35 3.3 6.9l-.15-1.5 1.45-.55.85-1.3 1.5.35L8 2.25z" /></svg>',
	more: '<svg class="appbar-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.15" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.15" fill="currentColor" stroke="none" /><circle cx="12.5" cy="8" r="1.15" fill="currentColor" stroke="none" /></svg>',
};

function iconHtml(icon: string | undefined): string {
	if (!icon) {
		return '';
	}
	const key = icon.trim().toLowerCase();
	return SYMBOL_SVG[key] ?? SYMBOL_SVG.more ?? '';
}

function isSecondaryProperty(node: XmlNode): boolean {
	return (
		node.localName === 'commandbar.secondarycommands' ||
		node.localName === 'secondarycommands' ||
		node.localName.endsWith('.secondarycommands')
	);
}

export function renderAppBarButton(
	node: XmlNode,
	ctx: RenderContext,
	labelPosition = 'right'
): string {
	const props = processProperties(node, ctx);
	const label = getAttr(node, 'Label')?.trim() ?? '';
	const icon = iconHtml(getAttr(node, 'Icon'));
	const position = labelPosition.toLowerCase();
	const labelHtml =
		label && position !== 'collapsed'
			? `<span class="appbar-label">${escapeHtmlText(label)}</span>`
			: '';
	const cls =
		position === 'bottom'
			? ' class="label-bottom"'
			: position === 'collapsed'
				? ' class="label-collapsed"'
				: '';
	return `<button type="button" data-xaml="AppBarButton"${cls}${styleAttr(props.style)}${props.attrs}>${icon}${labelHtml}</button>`;
}

export function renderCommandBar(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const labelPosition = getAttr(node, 'DefaultLabelPosition') ?? 'Bottom';
	const overflowMode = (
		getAttr(node, 'OverflowButtonVisibility') ?? 'Auto'
	).toLowerCase();
	const primary: string[] = [];
	let hasSecondary = false;

	for (const child of node.children) {
		if (isSecondaryProperty(child)) {
			processProperties(child, ctx);
			ctx.renderChildren(child.children);
			hasSecondary = child.children.length > 0;
			continue;
		}
		if (child.localName === 'appbarbutton') {
			primary.push(renderAppBarButton(child, ctx, labelPosition));
			continue;
		}
		primary.push(ctx.renderNode(child));
	}

	const showOverflow =
		overflowMode === 'visible' || (overflowMode === 'auto' && hasSecondary);
	const overflow = showOverflow
		? `<button type="button" class="commandbar-overflow" aria-label="More">${SYMBOL_SVG.more}</button>`
		: '';

	return `<div data-xaml="CommandBar"${styleAttr(props.style)}${props.attrs}>${primary.join('')}${overflow}</div>`;
}

export function renderSecondaryCommands(
	node: XmlNode,
	ctx: RenderContext
): string {
	processProperties(node, ctx);
	ctx.renderChildren(node.children);
	return '';
}
