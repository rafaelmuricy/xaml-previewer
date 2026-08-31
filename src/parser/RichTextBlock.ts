import { escapeHtmlText, getAttr, processProperties, styleAttr } from './properties';
import type { RenderContext, XmlNode } from './types';

function inlineText(node: XmlNode): string {
	const textAttr = getAttr(node, 'Text');
	return escapeHtmlText(textAttr !== undefined ? textAttr : node.text);
}

export function renderRun(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	return `<span data-xaml="Run"${styleAttr(props.style)}${props.attrs}>${inlineText(node)}</span>`;
}

export function renderParagraph(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const nested = node.children.find(
		(child) =>
			child.localName === 'paragraph.inlines' ||
			child.localName.endsWith('.inlines')
	);
	const inlines = nested ? nested.children : node.children;
	const inner = inlines.length
		? inlines.map((child) => ctx.renderNode(child)).join('')
		: inlineText(node);
	return `<div data-xaml="Paragraph"${styleAttr(props.style)}${props.attrs}>${inner}</div>`;
}

export function renderRichTextBlock(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const nested = node.children.find(
		(child) =>
			child.localName === 'richtextblock.blocks' ||
			child.localName.endsWith('.blocks')
	);
	const blocks = nested ? nested.children : node.children;
	const inner = blocks.map((child) => ctx.renderNode(child)).join('');
	return `<div data-xaml="RichTextBlock"${styleAttr(props.style)}${props.attrs}>${inner}</div>`;
}
