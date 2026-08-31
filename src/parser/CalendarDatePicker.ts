import {
	escapeHtmlText,
	getAttr,
	headerHtml,
	inputFillStyle,
	inputHostStyle,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

const MONTH_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

const CALENDAR_GLYPH =
	'<svg class="calendar-date-glyph" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.25" /><path d="M2.25 6.5h11.5" /><path d="M5.25 2v2.5M10.75 2v2.5" /></svg>';

function unwrapXamlLiteral(value: string): string {
	const trimmed = value.trim();
	return trimmed.startsWith('{}') ? trimmed.slice(2) : trimmed;
}

function parseDate(raw: string | undefined): Date | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const value = raw.trim();
	if (!value || /^\{x:Null\}$/i.test(value)) {
		return undefined;
	}
	const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (ymd) {
		return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
	}
	const iso = Date.parse(value);
	if (Number.isFinite(iso)) {
		return new Date(iso);
	}
	return undefined;
}

function formatDate(date: Date, dateFormat: string | undefined): string {
	const pattern = dateFormat
		? unwrapXamlLiteral(dateFormat)
		: '{day.integer}/{month.integer}/{year.full}';
	return pattern.replace(/\{([^}]+)\}/g, (_match, token: string) => {
		switch (token.trim().toLowerCase()) {
			case 'day.integer':
				return String(date.getDate());
			case 'day.integer(2)':
				return String(date.getDate()).padStart(2, '0');
			case 'month.integer':
				return String(date.getMonth() + 1);
			case 'month.integer(2)':
				return String(date.getMonth() + 1).padStart(2, '0');
			case 'month.full':
				return MONTH_NAMES[date.getMonth()] ?? '';
			case 'month.abbreviated':
				return MONTH_SHORT[date.getMonth()] ?? '';
			case 'year.full':
				return String(date.getFullYear());
			case 'year.abbreviated':
				return String(date.getFullYear()).slice(-2);
			default:
				return `{${token}}`;
		}
	});
}

export function renderCalendarDatePicker(
	node: XmlNode,
	ctx: RenderContext
): string {
	const props = processProperties(node, ctx);
	const date =
		parseDate(getAttr(node, 'SelectedDate')) ?? parseDate(getAttr(node, 'Date'));
	const placeholder = getAttr(node, 'PlaceholderText')?.trim() ?? 'select a date';
	const display = date
		? formatDate(date, getAttr(node, 'DateFormat'))
		: placeholder;
	const valueClass = date
		? 'calendar-date-value'
		: 'calendar-date-value placeholder';
	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="CalendarDatePicker"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="calendar-date-field"${styleAttr(fill)}><span class="${valueClass}">${escapeHtmlText(display)}</span>${CALENDAR_GLYPH}</div></div>`;
}
