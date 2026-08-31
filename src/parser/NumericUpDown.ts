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

function parseFallbackValue(raw: string): string | undefined {
	const match =
		/FallbackValue\s*=\s*(?:(\{[^}]+\})|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,\s}]+))/i.exec(
			raw
		);
	if (!match) {
		return undefined;
	}
	return (match[1] ?? match[2]).trim().replace(/^['"]|['"]$/g, '');
}

function parseNumeric(raw: string | undefined): number | undefined {
	if (!raw) {
		return undefined;
	}
	let value = raw.trim();
	if (isMarkupExtension(value)) {
		const fallback = parseFallbackValue(value);
		if (fallback === undefined) {
			return undefined;
		}
		value = fallback;
	}
	if (!value || /^\{x:Null\}$/i.test(value)) {
		return undefined;
	}
	const normalized = value.replace(/\s/g, '').replace(',', '.');
	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveLocale(culture: string | undefined): string | undefined {
	if (!culture || isMarkupExtension(culture)) {
		return undefined;
	}
	const trimmed = culture.trim();
	return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(trimmed) ? trimmed : undefined;
}

function defaultFractionDigits(kind: string): number {
	switch (kind) {
		case 'D':
		case 'X':
			return 0;
		case 'E':
			return 6;
		case 'G':
			return 0;
		default:
			return 2;
	}
}

function currencyForLocale(locale: string | undefined): string {
	try {
		const region = new Intl.Locale(locale ?? 'en').maximize().region;
		const byRegion: Record<string, string> = {
			BR: 'BRL',
			US: 'USD',
			GB: 'GBP',
			PT: 'EUR',
			ES: 'EUR',
			FR: 'EUR',
			DE: 'EUR',
			IT: 'EUR',
			JP: 'JPY',
			CN: 'CNY',
		};
		return (region && byRegion[region]) || 'USD';
	} catch {
		return 'USD';
	}
}

function formatStandard(
	value: number,
	kind: string,
	digits: number,
	locale: string | undefined
): string {
	switch (kind) {
		case 'C':
			return value.toLocaleString(locale, {
				style: 'currency',
				currency: currencyForLocale(locale),
				minimumFractionDigits: digits,
				maximumFractionDigits: digits,
			});
		case 'D':
			return Math.trunc(value)
				.toString()
				.replace('-', '')
				.padStart(digits, '0')
				.replace(/^/, value < 0 ? '-' : '');
		case 'E':
			return value.toExponential(digits);
		case 'F':
			return value.toLocaleString(locale, {
				minimumFractionDigits: digits,
				maximumFractionDigits: digits,
				useGrouping: false,
			});
		case 'G':
			return digits > 0
				? value.toLocaleString(locale, {
						maximumSignificantDigits: digits,
						useGrouping: false,
					})
				: value.toLocaleString(locale, { useGrouping: false });
		case 'N':
			return value.toLocaleString(locale, {
				minimumFractionDigits: digits,
				maximumFractionDigits: digits,
				useGrouping: true,
			});
		case 'P':
			return value.toLocaleString(locale, {
				style: 'percent',
				minimumFractionDigits: digits,
				maximumFractionDigits: digits,
			});
		case 'X':
			return Math.trunc(value)
				.toString(16)
				.padStart(digits, '0')
				.toUpperCase();
		default:
			return value.toLocaleString(locale);
	}
}

function formatCustom(
	value: number,
	format: string,
	locale: string | undefined
): string {
	const decimalPart = /\.([0#]+)/.exec(format);
	const digits = decimalPart ? decimalPart[1].length : 0;
	return value.toLocaleString(locale, {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
		useGrouping: format.includes(','),
	});
}

function formatNumericValue(
	value: number,
	formatString: string | undefined,
	locale: string | undefined
): string {
	const format = (formatString ?? '').trim();
	if (!format || isMarkupExtension(format)) {
		return value.toLocaleString(locale);
	}

	const standard = /^([CcDdEeFfGgNnPpXx])(\d+)?$/.exec(format);
	if (standard) {
		const kind = standard[1].toUpperCase();
		const digits =
			standard[2] !== undefined
				? Number(standard[2])
				: defaultFractionDigits(kind);
		return formatStandard(value, kind, digits, locale);
	}

	return formatCustom(value, format, locale);
}

function clamp(
	value: number,
	minimum: number | undefined,
	maximum: number | undefined
): number {
	let next = value;
	if (minimum !== undefined) {
		next = Math.max(next, minimum);
	}
	if (maximum !== undefined) {
		next = Math.min(next, maximum);
	}
	return next;
}

function isVisible(raw: string | undefined, fallback: boolean): boolean {
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	return raw.trim().toLowerCase() !== 'false';
}

const CHEVRON_UP =
	'<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><polyline points="2.2,8 6,3.4 9.8,8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_DOWN =
	'<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><polyline points="2.2,4 6,8.6 9.8,4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function spinButtonsHtml(): string {
	return `<span class="spin-buttons"><span class="spin-btn spin-up">${CHEVRON_UP}</span><span class="spin-btn spin-down">${CHEVRON_DOWN}</span></span>`;
}

function textAlignStyle(alignment: string | undefined): string {
	if (!alignment || isMarkupExtension(alignment)) {
		return '';
	}
	switch (alignment.trim().toLowerCase()) {
		case 'center':
			return 'text-align: center';
		case 'right':
			return 'text-align: right';
		case 'left':
			return 'text-align: left';
		default:
			return '';
	}
}

export function renderNumericUpDown(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const rawValue = getAttr(node, 'Value');
	const rawText = getAttr(node, 'Text');
	const minimum = parseNumeric(getAttr(node, 'Minimum'));
	const maximum = parseNumeric(getAttr(node, 'Maximum'));
	const locale = resolveLocale(getAttr(node, 'Culture'));
	const formatString = getAttr(node, 'FormatString');
	const watermark =
		getAttr(node, 'Watermark') ?? getAttr(node, 'PlaceholderText');
	const parsed = parseNumeric(rawValue);
	const value = parsed !== undefined ? clamp(parsed, minimum, maximum) : 0;
	const hasLiteralText = rawText !== undefined && !isMarkupExtension(rawText);
	const display = hasLiteralText
		? rawText.trim()
		: formatNumericValue(value, formatString, locale);
	const placeholderAttr = watermark
		? ` placeholder="${escapeHtmlAttr(watermark)}"`
		: '';
	const align = textAlignStyle(getAttr(node, 'HorizontalContentAlignment'));
	const showSpinner = isVisible(getAttr(node, 'ShowButtonSpinner'), true);
	const spinnerLeft =
		(getAttr(node, 'ButtonSpinnerLocation') ?? 'Right').toLowerCase() ===
		'left';
	const spinnerClass = spinnerLeft ? ' spin-left' : '';
	const spinner = showSpinner ? spinButtonsHtml() : '';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	const input = `<input class="numeric-input" type="text" spellcheck="false" value="${escapeHtmlAttr(display)}"${placeholderAttr}${styleAttr(align)} />`;
	const field = spinnerLeft ? `${spinner}${input}` : `${input}${spinner}`;
	return `<div data-xaml="NumericUpDown"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="numeric-field${spinnerClass}"${styleAttr(fill)}>${field}</div></div>`;
}
