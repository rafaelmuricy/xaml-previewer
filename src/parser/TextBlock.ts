import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function cssPropertyValue(style: string, prop: string): string | undefined {
	const match = new RegExp(`(?:^|;\\s*)${prop}\\s*:\\s*([^;]+)`, 'i').exec(
		style
	);
	const value = match?.[1]?.trim();
	return value || undefined;
}

export function renderTextBlock(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const textAttr = getAttr(node, 'Text') ?? getAttr(node, 'Content');
	const children = ctx.renderChildren(node.children);
	const plainText =
		textAttr !== undefined ? textAttr : node.children.length ? undefined : node.text;
	const text =
		textAttr !== undefined
			? escapeHtmlText(textAttr)
			: node.text
				? escapeHtmlText(node.text)
				: children;

	let wrapping = (getAttr(node, 'TextWrapping') ?? '').toLowerCase();
	let trimming = (getAttr(node, 'TextTrimming') ?? '').toLowerCase();
	const lineBreakMode = (getAttr(node, 'LineBreakMode') ?? '').toLowerCase();
	if (!wrapping) {
		if (lineBreakMode === 'wordwrap' || lineBreakMode === 'characterwrap') {
			wrapping = 'wrap';
		} else if (lineBreakMode === 'nowrap') {
			wrapping = 'nowrap';
		} else if (
			lineBreakMode === 'tailtruncation' ||
			lineBreakMode === 'headtruncation' ||
			lineBreakMode === 'middletruncation'
		) {
			wrapping = 'nowrap';
			if (!trimming) {
				trimming = 'characterellipsis';
			}
		}
	}
	const maxLinesRaw = getAttr(node, 'MaxLines');
	const maxLines = maxLinesRaw ? Number.parseInt(maxLinesRaw, 10) : undefined;
	const wrap =
		wrapping === 'wrap' || wrapping === 'wrapwholewords';
	const hasMaxLines =
		maxLines !== undefined && Number.isFinite(maxLines) && maxLines > 0;
	const clips =
		trimming === 'characterellipsis' ||
		trimming === 'wordellipsis' ||
		trimming === 'clip';

	const extra: string[] = ['min-width: 0'];

	if (wrapping === 'nowrap') {
		extra.push('white-space: nowrap');
	} else if (wrapping === 'wrap' || lineBreakMode === 'wordwrap') {
		extra.push(
			'white-space: normal',
			lineBreakMode === 'characterwrap'
				? 'overflow-wrap: anywhere'
				: 'overflow-wrap: break-word'
		);
	} else if (wrapping === 'wrapwholewords') {
		extra.push('white-space: normal', 'overflow-wrap: normal');
	} else if (lineBreakMode === 'characterwrap') {
		extra.push('white-space: normal', 'overflow-wrap: anywhere');
	}

	if (clips) {
		extra.push('overflow: hidden');
		if (!wrap) {
			extra.push(
				trimming === 'clip' ? 'text-overflow: clip' : 'text-overflow: ellipsis'
			);
		} else if (hasMaxLines) {
			if (trimming === 'characterellipsis') {
				extra.push(
					'display: -webkit-box',
					'-webkit-box-orient: vertical',
					`-webkit-line-clamp: ${maxLines}`
				);
			} else {
				const lineHeight = cssPropertyValue(props.style, 'line-height');
				extra.push(
					`max-height: ${lineHeight ? `calc(${maxLines} * ${lineHeight})` : `${maxLines * 1.2}em`}`
				);
			}
		}
	} else if (wrap && hasMaxLines) {
		const lineHeight = cssPropertyValue(props.style, 'line-height');
		extra.push(
			'overflow: hidden',
			`max-height: ${lineHeight ? `calc(${maxLines} * ${lineHeight})` : `${maxLines * 1.2}em`}`
		);
	}

	const isReadOnly = (getAttr(node, 'IsReadOnly') ?? '').toLowerCase() === 'true';
	if (isReadOnly) {
		extra.push(
			'color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.55))'
		);
	}

	const merged = [props.style, ...extra].filter(Boolean).join('; ');
	const attrs: string[] = [props.attrs];
	if (trimming) {
		attrs.push(` data-text-trimming="${escapeHtmlAttr(trimming)}"`);
	}
	if (wrap) {
		attrs.push(' data-text-wrapping="wrap"');
	}
	if (hasMaxLines) {
		attrs.push(` data-max-lines="${maxLines}"`);
	}
	if (trimming === 'wordellipsis' && plainText) {
		attrs.push(` data-full-text="${escapeHtmlAttr(plainText)}"`);
	}

	return `<span data-xaml="${node.tagName}"${styleAttr(merged)}${attrs.join('')}>${text}</span>`;
}
