import {
	escapeHtmlAttr,
	getAttr,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderPasswordBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const password = getAttr(node, 'Password') ?? '';
	const placeholder = getAttr(node, 'PlaceholderText');
	const maxLength = getAttr(node, 'MaxLength');
	const revealMode = (getAttr(node, 'PasswordRevealMode') ?? 'Peek').toLowerCase();
	const inputType = revealMode === 'visible' ? 'text' : 'password';
	const valueAttr = password ? ` value="${escapeHtmlAttr(password)}"` : '';
	const placeholderAttr = placeholder
		? ` placeholder="${escapeHtmlAttr(placeholder)}"`
		: '';
	const maxLengthAttr =
		maxLength && /^\d+$/.test(maxLength.trim())
			? ` maxlength="${escapeHtmlAttr(maxLength.trim())}"`
			: '';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="PasswordBox"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<input type="${inputType}" spellcheck="false"${valueAttr}${placeholderAttr}${maxLengthAttr}${styleAttr(fill)} /></div>`;
}