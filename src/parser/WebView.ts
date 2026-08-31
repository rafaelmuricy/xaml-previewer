import {
	escapeHtmlText,
	getAttr,
	hasCssProperty,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isSourceProperty(node: XmlNode): boolean {
	return node.localName === 'webview.source' || node.localName.endsWith('.source');
}

function isHtmlProperty(node: XmlNode): boolean {
	return (
		node.localName === 'htmlwebviewsource.html' || node.localName.endsWith('.html')
	);
}

function collectHtml(node: XmlNode): string | undefined {
	for (const child of node.children) {
		if (isSourceProperty(child)) {
			const nested = collectHtml(child);
			if (nested) {
				return nested;
			}
			continue;
		}
		if (child.localName === 'htmlwebviewsource') {
			const attr = getAttr(child, 'Html');
			if (attr && !isMarkupExtension(attr)) {
				return attr;
			}
			if (child.text) {
				return child.text;
			}
			const nested = collectHtml(child);
			if (nested) {
				return nested;
			}
			continue;
		}
		if (isHtmlProperty(child) && child.text) {
			return child.text;
		}
	}
	return undefined;
}

function collectUrl(node: XmlNode): string | undefined {
	const source = getAttr(node, 'Source');
	if (source && !isMarkupExtension(source)) {
		return source;
	}
	for (const child of node.children) {
		if (!isSourceProperty(child) && child.localName !== 'urlwebviewsource') {
			continue;
		}
		const url = getAttr(child, 'Url') ?? getAttr(child, 'Source');
		if (url && !isMarkupExtension(url)) {
			return url;
		}
		for (const inner of child.children) {
			if (inner.localName !== 'urlwebviewsource') {
				continue;
			}
			const innerUrl = getAttr(inner, 'Url') ?? inner.text;
			if (innerUrl && !isMarkupExtension(innerUrl)) {
				return innerUrl;
			}
		}
	}
	return undefined;
}

function previewFromHtml(html: string): { innerHtml: string; style: string } {
	const body = /<body\b([^>]*)>([\s\S]*?)<\/body>/i.exec(html);
	if (body) {
		const style = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(body[1]);
		return {
			innerHtml: body[2].trim(),
			style: (style?.[1] ?? style?.[2] ?? '').trim(),
		};
	}
	return { innerHtml: html.trim(), style: '' };
}

export function renderWebView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const html = collectHtml(node);
	const preview = html ? previewFromHtml(html) : undefined;
	const url = preview ? undefined : collectUrl(node);
	const content = preview
		? `<div class="webview-document"${styleAttr(preview.style)}>${preview.innerHtml}</div>`
		: url
			? `<div class="webview-url">${escapeHtmlText(url)}</div>`
			: '';
	const merged = [
		'box-sizing: border-box',
		'overflow: hidden',
		'min-width: 0',
		hasCssProperty(props.style, 'width') ? '' : 'width: 100%',
		props.style,
	]
		.filter(Boolean)
		.join('; ');
	return `<div data-xaml="WebView"${styleAttr(merged)}${props.attrs}>${content}</div>`;
}
