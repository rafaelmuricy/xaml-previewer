import {
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isSplitViewProperty(node: XmlNode, suffix: string): boolean {
	const lower = node.localName;
	return (
		lower === `splitview.${suffix}` ||
		lower === suffix ||
		lower.endsWith(`.${suffix}`)
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

export function renderSplitView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	let paneNode: XmlNode | undefined;
	let contentNode: XmlNode | undefined;
	const contentChildren: XmlNode[] = [];

	for (const child of node.children) {
		if (isSplitViewProperty(child, 'pane')) {
			paneNode = child;
			continue;
		}
		if (isSplitViewProperty(child, 'content')) {
			contentNode = child;
			continue;
		}
		contentChildren.push(child);
	}

	if (paneNode) {
		processProperties(paneNode, ctx);
	}
	if (contentNode) {
		processProperties(contentNode, ctx);
	}

	const isOpen = parseBool(getAttr(node, 'IsPaneOpen'), false);
	const displayMode = (getAttr(node, 'DisplayMode') ?? 'Overlay').toLowerCase();
	const panePlacement = (getAttr(node, 'PanePlacement') ?? 'Left').toLowerCase();
	const openLength = toCssLength(getAttr(node, 'OpenPaneLength') ?? '320') ?? '320px';
	const compactLength =
		toCssLength(getAttr(node, 'CompactPaneLength') ?? '48') ?? '48px';
	const paneBackground = getAttr(node, 'PaneBackground');
	const compact = displayMode === 'compactinline' || displayMode === 'compactoverlay';
	const overlay = displayMode === 'overlay' || displayMode === 'compactoverlay';
	const inline = displayMode === 'inline' || displayMode === 'compactinline';
	const paneOnRight = panePlacement === 'right';

	let paneWidth = openLength;
	let showPane = isOpen;
	let paneInFlow = isOpen && inline;
	if (!isOpen && compact) {
		paneWidth = compactLength;
		showPane = true;
		paneInFlow = true;
	}

	const paneInner = paneNode ? ctx.renderChildren(paneNode.children) : '';
	const contentInner = contentNode
		? ctx.renderChildren(contentNode.children)
		: ctx.renderChildren(contentChildren);

	const paneStyle = [
		`width: ${paneWidth}`,
		'flex: 0 0 auto',
		'box-sizing: border-box',
		paneBackground ? `background-color: ${paneBackground}` : '',
		overlay && isOpen && !paneInFlow
			? 'position: absolute; top: 0; bottom: 0; z-index: 1'
			: '',
		overlay && isOpen && !paneInFlow
			? paneOnRight
				? 'right: 0'
				: 'left: 0'
			: '',
	]
		.filter(Boolean)
		.join('; ');

	const compactSpacer =
		displayMode === 'compactoverlay' && isOpen
			? `<div class="split-compact-spacer" style="width: ${compactLength}; flex: 0 0 auto;"></div>`
			: '';

	const paneHtml = showPane
		? `<div data-xaml="SplitView.Pane"${styleAttr(paneStyle)}>${paneInner}</div>`
		: '';

	const contentStyle = [
		'flex: 0 0 auto',
		'width: max-content',
		'max-width: 100%',
		'box-sizing: border-box',
	].join('; ');
	const contentHtml = `<div data-xaml="SplitView.Content"${styleAttr(contentStyle)}>${contentInner}</div>`;

	const host = [
		'position: relative',
		'display: flex',
		`flex-direction: ${paneOnRight ? 'row-reverse' : 'row'}`,
		'align-items: stretch',
		'width: max-content',
		'max-width: 100%',
		'height: max-content',
		'box-sizing: border-box',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const body = paneOnRight
		? `${contentHtml}${compactSpacer}${paneHtml}`
		: `${paneHtml}${compactSpacer}${contentHtml}`;

	return `<div data-xaml="SplitView"${styleAttr(host)}${props.attrs}>${body}</div>`;
}
