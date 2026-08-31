import {
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

export function renderToggleSwitch(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const isOn =
		(getAttr(node, 'IsOn') ?? getAttr(node, 'IsToggled') ?? '').toLowerCase() ===
		'true';
	const header = getAttr(node, 'Header')?.trim();
	const onContent = getAttr(node, 'OnContent');
	const offContent = getAttr(node, 'OffContent');
	const isSwitch = node.localName === 'switch';
	const contentText = isSwitch
		? ''
		: isOn
			? (onContent ?? 'On')
			: (offContent ?? 'Off');

	const headerHtml = header
		? `<span class="toggle-header">${escapeHtmlText(header)}</span>`
		: '';
	const contentHtml = contentText
		? `<span class="toggle-content">${escapeHtmlText(contentText)}</span>`
		: '';
	const trackClass = isOn ? 'toggle-track on' : 'toggle-track';

	return `<div data-xaml="${node.tagName}"${styleAttr(props.style)}${props.attrs}>${headerHtml}<div class="toggle-row"><span class="${trackClass}"></span>${contentHtml}</div></div>`;
}
