import {
	escapeHtmlText,
	getAttr,
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

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isTrue(raw: string | undefined, fallback: boolean): boolean {
	if (raw === undefined || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = raw.trim().toLowerCase();
	if (value === 'true') {
		return true;
	}
	if (value === 'false') {
		return false;
	}
	return fallback;
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

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function monthGrid(view: Date): Date[] {
	const first = new Date(view.getFullYear(), view.getMonth(), 1);
	const start = new Date(first);
	start.setDate(first.getDate() - first.getDay());
	const cells: Date[] = [];
	for (let i = 0; i < 42; i++) {
		cells.push(
			new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
		);
	}
	return cells;
}

export function renderCalendarView(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const today = startOfDay(new Date());
	const viewDate =
		parseDate(getAttr(node, 'DisplayDate')) ??
		parseDate(getAttr(node, 'SelectedDate')) ??
		today;
	const selected = parseDate(getAttr(node, 'SelectedDate'));
	const outOfScope = isTrue(getAttr(node, 'IsOutOfScopeEnabled'), true);
	const todayHighlighted = isTrue(getAttr(node, 'IsTodayHighlighted'), true);
	const groupLabels = isTrue(getAttr(node, 'IsGroupLabelVisible'), true);
	const header = `${MONTH_NAMES[viewDate.getMonth()] ?? ''} ${viewDate.getFullYear()}`;
	const cells = monthGrid(viewDate);

	const headersHtml = DAY_HEADERS.map(
		(label) => `<span class="cal-dow">${escapeHtmlText(label)}</span>`
	).join('');

	const daysHtml = cells
		.map((day) => {
			const inMonth = day.getMonth() === viewDate.getMonth();
			if (!inMonth && !outOfScope) {
				return '<span class="cal-day empty"></span>';
			}
			const classes = ['cal-day'];
			if (!inMonth) {
				classes.push('out-of-scope');
			}
			if (todayHighlighted && sameDay(day, today)) {
				classes.push('today');
			}
			if (selected && sameDay(day, selected)) {
				classes.push('selected');
			}
			const label =
				groupLabels && day.getDate() === 1
					? `${MONTH_SHORT[day.getMonth()] ?? ''} ${day.getDate()}`
					: String(day.getDate());
			if (groupLabels && day.getDate() === 1) {
				classes.push('group-label');
			}
			return `<span class="${classes.join(' ')}">${escapeHtmlText(label)}</span>`;
		})
		.join('');

	const merged = [
		'display: inline-flex',
		'flex-direction: column',
		'box-sizing: border-box',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	return `<div data-xaml="CalendarView"${styleAttr(merged)}${props.attrs}><div class="cal-header"><span class="cal-title">${escapeHtmlText(header)}</span><span class="cal-nav"><span class="cal-nav-btn">&#8963;</span><span class="cal-nav-btn">&#8964;</span></span></div><div class="cal-dows">${headersHtml}</div><div class="cal-grid">${daysHtml}</div></div>`;
}
