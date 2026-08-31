import {
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isTrue(raw: string | undefined, defaultValue: boolean): boolean {
	if (raw === undefined) {
		return defaultValue;
	}
	return raw.toLowerCase() === 'true';
}

function severityClass(raw: string | undefined): string {
	switch ((raw ?? 'Informational').toLowerCase()) {
		case 'success':
			return 'success';
		case 'warning':
			return 'warning';
		case 'error':
			return 'error';
		default:
			return 'informational';
	}
}

export function renderInfoBar(node: XmlNode, ctx: RenderContext): string {
	if (!isTrue(getAttr(node, 'IsOpen'), true)) {
		return '';
	}

	const props = processProperties(node, ctx);
	const title = getAttr(node, 'Title')?.trim() ?? '';
	const message = getAttr(node, 'Message')?.trim() ?? '';
	const closable = isTrue(getAttr(node, 'IsClosable'), true);
	const severity = severityClass(getAttr(node, 'Severity'));

	let actionHtml = '';
	for (const child of node.children) {
		if (
			child.localName === 'infobar.actionbutton' ||
			child.localName.endsWith('.actionbutton')
		) {
			actionHtml = `<div class="info-action">${ctx.renderChildren(child.children)}</div>`;
		}
	}

	const titleHtml = title
		? `<div class="info-title">${escapeHtmlText(title)}</div>`
		: '';
	const messageHtml = message
		? `<div class="info-message">${escapeHtmlText(message)}</div>`
		: '';
	const closeHtml = closable ? '<span class="info-close">&#10005;</span>' : '';
	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="InfoBar" class="${severity}"${styleAttr(merged)}${props.attrs}><span class="info-icon"></span><div class="info-text">${titleHtml}${messageHtml}</div>${actionHtml}${closeHtml}</div>`;
}
