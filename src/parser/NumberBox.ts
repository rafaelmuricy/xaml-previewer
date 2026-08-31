import {
	escapeHtmlAttr,
	getAttr,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function spinButtonsHtml(mode: string): string {
	if (mode === 'hidden') {
		return '';
	}
	if (mode === 'compact') {
		return '<span class="spin-buttons compact"><span class="spin-btn spin-down">&#8964;</span></span>';
	}
	return '<span class="spin-buttons inline"><span class="spin-btn spin-up">&#8963;</span><span class="spin-btn spin-down">&#8964;</span></span>';
}

export function renderNumberBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const rawValue = getAttr(node, 'Value') ?? '';
	const value = isMarkupExtension(rawValue) ? '' : rawValue;
	const placeholder = getAttr(node, 'PlaceholderText');
	const spinMode = (getAttr(node, 'SpinButtonPlacementMode') ?? 'Compact').toLowerCase();
	const valueAttr = value ? ` value="${escapeHtmlAttr(value)}"` : '';
	const placeholderAttr = placeholder
		? ` placeholder="${escapeHtmlAttr(placeholder)}"`
		: '';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="NumberBox"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="number-field"${styleAttr(fill)}><input class="number-input" type="text" spellcheck="false"${valueAttr}${placeholderAttr} />${spinButtonsHtml(spinMode)}</div></div>`;
}
