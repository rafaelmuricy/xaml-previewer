import { resolveImageUrl } from './Image';
import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function initialsFromDisplayName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return '';
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	const first = parts[0][0] ?? '';
	const last = parts[parts.length - 1][0] ?? '';
	return `${first}${last}`.toUpperCase();
}

function initialsFontSize(style: string): string {
	const match = /(?:^|;\s*)height\s*:\s*([^;]+)/i.exec(style);
	return match?.[1]?.trim() || '100px';
}

function pictureText(node: XmlNode): string {
	const initials = getAttr(node, 'Initials')?.trim();
	if (initials && !isMarkupExtension(initials)) {
		return initials;
	}
	const displayName = getAttr(node, 'DisplayName')?.trim();
	if (displayName && !isMarkupExtension(displayName)) {
		return initialsFromDisplayName(displayName);
	}
	return '';
}

export function renderPersonPicture(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const photo = resolveImageUrl(ctx, getAttr(node, 'ProfilePicture'));
	const merged = [
		hasCssProperty(props.style, 'width') ? '' : 'width: 100px',
		hasCssProperty(props.style, 'height') ? '' : 'height: 100px',
		hasCssProperty(props.style, 'font-size')
			? ''
			: `font-size: ${initialsFontSize(props.style)}`,
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const inner = photo
		? `<img src="${escapeHtmlAttr(photo)}" alt="" />`
		: `<span class="person-initials">${escapeHtmlText(pictureText(node))}</span>`;

	return `<div data-xaml="PersonPicture"${styleAttr(merged)}${props.attrs}>${inner}</div>`;
}
