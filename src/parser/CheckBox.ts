import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function checkState(node: XmlNode): 'checked' | 'indeterminate' | 'unchecked' {
	const raw = getAttr(node, 'IsChecked');
	if ((raw ?? '').toLowerCase() === 'true') {
		return 'checked';
	}
	const threeState = (getAttr(node, 'IsThreeState') ?? '').toLowerCase() === 'true';
	if (
		threeState &&
		(raw === undefined || raw.trim() === '' || /^\s*\{x:Null\}\s*$/i.test(raw))
	) {
		return 'indeterminate';
	}
	return 'unchecked';
}

export function renderCheckBox(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const state = checkState(node);
	const content = getAttr(node, 'Content');
	const children = ctx.renderChildren(node.children);
	const text =
		content !== undefined
			? escapeHtmlText(content)
			: node.text
				? escapeHtmlText(node.text)
				: children;
	const markClass =
		state === 'unchecked' ? 'check-mark' : `check-mark ${state}`;
	const contentHtml = text
		? `<span class="check-content">${text}</span>`
		: '';

	return `<div data-xaml="CheckBox"${styleAttr(props.style)}${props.attrs}><span class="${markClass}"></span>${contentHtml}</div>`;
}
