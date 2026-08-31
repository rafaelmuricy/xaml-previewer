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

interface ParsedTime {
	hours: number;
	minutes: number;
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

function parseTime(raw: string | undefined): ParsedTime | undefined {
	if (!raw || isMarkupExtension(raw)) {
		return undefined;
	}
	const value = raw.trim();
	if (!value || /^\{x:Null\}$/i.test(value)) {
		return undefined;
	}
	const hms = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value);
	if (hms) {
		return { hours: Number(hms[1]), minutes: Number(hms[2]) };
	}
	const iso = Date.parse(value);
	if (Number.isFinite(iso)) {
		const date = new Date(iso);
		return { hours: date.getHours(), minutes: date.getMinutes() };
	}
	return undefined;
}

function partHtml(
	kind: 'hour' | 'minute' | 'period',
	text: string,
	placeholder: boolean
): string {
	const cls = placeholder ? `time-part ${kind} placeholder` : `time-part ${kind}`;
	return `<span class="${cls}">${escapeHtmlText(text)}</span>`;
}

export function renderTimePicker(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const time =
		parseTime(getAttr(node, 'SelectedTime')) ?? parseTime(getAttr(node, 'Time'));
	const clock = (getAttr(node, 'ClockIdentifier') ?? '12HourClock').toLowerCase();
	const is24h = clock === '24hourclock';

	const parts: string[] = [];
	if (time) {
		if (is24h) {
			parts.push(partHtml('hour', pad2(time.hours), false));
		} else {
			const hour12 = time.hours % 12 || 12;
			parts.push(partHtml('hour', String(hour12), false));
		}
		parts.push(partHtml('minute', pad2(time.minutes), false));
		if (!is24h) {
			parts.push(partHtml('period', time.hours >= 12 ? 'PM' : 'AM', false));
		}
	} else {
		parts.push(partHtml('hour', 'hour', true));
		parts.push(partHtml('minute', 'minute', true));
		if (!is24h) {
			parts.push(partHtml('period', 'AM', true));
		}
	}

	const host = inputHostStyle(props.style);
	const fill = inputFillStyle(props.style);
	return `<div data-xaml="TimePicker"${styleAttr(host)}${props.attrs}>${headerHtml(getAttr(node, 'Header'))}<div class="time-field"${styleAttr(fill)}>${parts.join('')}</div></div>`;
}
