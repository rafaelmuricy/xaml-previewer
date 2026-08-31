import {
	escapeHtmlAttr,
	getAttr,
	inputFillStyle,
	inputHostStyle,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

const SEARCH_ICON =
	'<svg class="search-glyph" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.6 9.6L13.5 13.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

export function renderSearchBar(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const text = getAttr(node, 'Text') ?? '';
	const placeholder = getAttr(node, 'Placeholder');
	const valueAttr = text ? ` value="${escapeHtmlAttr(text)}"` : '';
	const placeholderAttr = placeholder
		? ` placeholder="${escapeHtmlAttr(placeholder)}"`
		: '';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="SearchBar"${styleAttr(host)}${props.attrs}><div class="search-field"${styleAttr(fill)}><input class="search-input" type="text" spellcheck="false"${valueAttr}${placeholderAttr} /><span class="search-icon">${SEARCH_ICON}</span></div></div>`;
}
