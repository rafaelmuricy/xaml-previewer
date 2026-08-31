import {
	escapeHtmlText,
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

const ICON_FONT =
	'font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif';

function isNavViewPropertyElement(node: XmlNode, suffix: string): boolean {
	const lower = node.localName;
	return (
		lower === `navigationview.${suffix}` ||
		lower === suffix ||
		lower.endsWith(`.${suffix}`)
	);
}

function isNavItemPropertyElement(node: XmlNode, suffix: string): boolean {
	const lower = node.localName;
	return (
		lower === `navigationviewitem.${suffix}` ||
		lower === suffix ||
		lower.endsWith(`.${suffix}`)
	);
}

function chromeIcon(codePoint: number): string {
	const char = escapeHtmlText(String.fromCodePoint(codePoint));
	const style = [
		ICON_FONT,
		'display: inline-block',
		'line-height: 1',
		'font-size: 16px',
	].join('; ');
	return `<span${styleAttr(style)}>${char}</span>`;
}

function selectedItemName(value: string | undefined): string | undefined {
	if (!value) {
		return undefined;
	}
	const bind = value.match(/\{x:Bind\s+([A-Za-z_][\w]*)/i);
	if (bind) {
		return bind[1];
	}
	if (isMarkupExtension(value)) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed || undefined;
}

export function renderNavigationViewItem(
	node: XmlNode,
	ctx: RenderContext,
	selected = false
): string {
	const props = processProperties(node, ctx);
	const content = getAttr(node, 'Content');
	let iconHtml = '';
	const otherChildren: XmlNode[] = [];

	for (const child of node.children) {
		if (isNavItemPropertyElement(child, 'icon')) {
			processProperties(child, ctx);
			iconHtml = ctx.renderChildren(child.children);
			continue;
		}
		otherChildren.push(child);
	}

	const label =
		content !== undefined
			? escapeHtmlText(content)
			: node.text
				? escapeHtmlText(node.text)
				: ctx.renderChildren(otherChildren);

	const merged = [
		'display: flex',
		'align-items: center',
		'gap: 12px',
		'padding: 8px 12px',
		'border-radius: 4px',
		'box-sizing: border-box',
		'cursor: pointer',
		selected
			? 'background-color: var(--vscode-list-activeSelectionBackground)'
			: '',
		selected ? 'color: var(--vscode-list-activeSelectionForeground)' : '',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="NavigationViewItem"${styleAttr(merged)}${props.attrs}>${iconHtml}${label ? `<span>${label}</span>` : ''}</div>`;
}

export function renderNavigationView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);

	let menuItemsNode: XmlNode | undefined;
	const contentChildren: XmlNode[] = [];

	for (const child of node.children) {
		if (isNavViewPropertyElement(child, 'menuitems')) {
			menuItemsNode = child;
			continue;
		}
		contentChildren.push(child);
	}

	const items: XmlNode[] = [];
	let menuAttrs = '';
	if (menuItemsNode) {
		menuAttrs = processProperties(menuItemsNode, ctx).attrs;
		for (const child of menuItemsNode.children) {
			if (child.localName === 'navigationviewitem') {
				items.push(child);
			} else {
				ctx.renderNode(child);
			}
		}
	}

	const selectedName = selectedItemName(getAttr(node, 'SelectedItem'));
	const matchIndex = selectedName
		? items.findIndex((item) => getAttr(item, 'Name') === selectedName)
		: 0;
	const selectedIndex = matchIndex >= 0 ? matchIndex : 0;

	const itemsHtml = items
		.map((item, index) =>
			renderNavigationViewItem(item, ctx, index === selectedIndex)
		)
		.join('');

	const menuHtml = `<div data-xaml="NavigationView.MenuItems" style="display: flex; flex-direction: column; gap: 2px;"${menuAttrs}>${itemsHtml}</div>`;

	const backVisible =
		(getAttr(node, 'IsBackButtonVisible') ?? 'auto').toLowerCase() ===
		'visible';
	const settingsVisible =
		(getAttr(node, 'IsSettingsVisible') ?? 'true').toLowerCase() !== 'false';
	const paneLength =
		toCssLength(getAttr(node, 'OpenPaneLength') ?? '320') ?? '320px';

	const chromeStyle =
		'display: flex; align-items: center; padding: 8px 12px; border-radius: 4px; box-sizing: border-box;';
	const backHtml = backVisible
		? `<div data-xaml="NavigationView.BackButton" style="${chromeStyle}">${chromeIcon(0xe72b)}</div>`
		: '';
	const hamburgerHtml = `<div data-xaml="NavigationView.PaneToggle" style="${chromeStyle}">${chromeIcon(0xe700)}</div>`;
	const settingsHtml = settingsVisible
		? `<div data-xaml="NavigationView.SettingsItem" style="${chromeStyle}">${chromeIcon(0xe713)}<span style="margin-left: 12px;">Settings</span></div>`
		: '';

	const paneStyle = [
		`width: ${paneLength}`,
		'flex-shrink: 0',
		'display: flex',
		'flex-direction: column',
		'box-sizing: border-box',
		'height: 100%',
		'background-color: var(--vscode-sideBar-background)',
		'border-right: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35))',
		'padding: 4px',
	].join('; ');

	const paneHtml = `<div data-xaml="NavigationView.Pane"${styleAttr(paneStyle)}>${backHtml}${hamburgerHtml}${menuHtml}<div style="flex: 1;"></div>${settingsHtml}</div>`;

	const placeholder = contentChildren
		.map((child) => escapeHtmlText(child.tagName))
		.join(' ');
	const contentStyle = [
		'flex: 1',
		'display: flex',
		'align-items: center',
		'justify-content: center',
		'min-width: 0',
		'height: 100%',
		'box-sizing: border-box',
	].join('; ');
	const contentHtml = `<div data-xaml="NavigationView.Content"${styleAttr(contentStyle)}>${placeholder}</div>`;

	const merged = [
		'position: absolute',
		'top: 0',
		'left: 0',
		'display: flex',
		'flex-direction: row',
		'width: 100%',
		'height: 100%',
		'box-sizing: border-box',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="NavigationView"${styleAttr(merged)}${props.attrs}>${paneHtml}${contentHtml}</div>`;
}
