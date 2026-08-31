import {
	escapeHtmlText,
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function parseNumber(raw: string | undefined, fallback: number): number {
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = Number(raw.trim());
	return Number.isFinite(value) ? value : fallback;
}

function starHtml(fill: number): string {
	if (fill >= 1) {
		return '<span class="rating-star filled">&#9733;</span>';
	}
	if (fill <= 0) {
		return '<span class="rating-star empty">&#9734;</span>';
	}
	const pct = Math.round(fill * 100);
	return `<span class="rating-star partial"><span class="rating-star-fill" style="width: ${pct}%">&#9733;</span>&#9734;</span>`;
}

export function renderRatingControl(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const maxRating = Math.min(20, Math.max(1, Math.round(parseNumber(getAttr(node, 'MaxRating'), 5))));
	const value = Math.min(maxRating, Math.max(0, parseNumber(getAttr(node, 'Value'), 0)));
	const caption = getAttr(node, 'Caption')?.trim();
	const stars = Array.from({ length: maxRating }, (_, index) =>
		starHtml(value - index)
	).join('');
	const captionHtml = caption
		? `<span class="rating-caption">${escapeHtmlText(caption)}</span>`
		: '';

	return `<div data-xaml="RatingControl"${styleAttr(props.style)}${props.attrs}><span class="rating-stars">${stars}</span>${captionHtml}</div>`;
}
