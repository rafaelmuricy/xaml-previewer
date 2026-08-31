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

function isVisible(raw: string | undefined): boolean {
	return (raw ?? 'True').toLowerCase() !== 'false';
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

function partHtml(
	kind: 'day' | 'month' | 'year',
	text: string,
	placeholder: boolean
): string {
	const cls = placeholder ? `date-part ${kind} placeholder` : `date-part ${kind}`;
	return `<span class="${cls}">${escapeHtmlText(text)}</span>`;
}

export function renderDatePicker(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const date =
		parseDate(getAttr(node, 'SelectedDate')) ?? parseDate(getAttr(node, 'Date'));
	const showDay = isVisible(getAttr(node, 'DayVisible'));
	const showMonth = isVisible(getAttr(node, 'MonthVisible'));
	const showYear = isVisible(getAttr(node, 'YearVisible'));

	const parts: string[] = [];
	if (showDay) {
		parts.push(
			date
				? partHtml('day', String(date.getDate()), false)
				: partHtml('day', 'day', true)
		);
	}
	if (showMonth) {
		parts.push(
			date
				? partHtml('month', MONTH_NAMES[date.getMonth()] ?? 'month', false)
				: partHtml('month', 'month', true)
		);
	}
	if (showYear) {
		parts.push(
			date
				? partHtml('year', String(date.getFullYear()), false)
				: partHtml('year', 'year', true)
		);
	}

	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="DatePicker"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="date-field"${styleAttr(fill)}>${parts.join('')}</div></div>`;
}
