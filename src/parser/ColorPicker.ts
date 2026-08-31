import {
	escapeHtmlAttr,
	escapeHtmlText,
	getAttr,
	isMarkupExtension,
	processProperties,
	styleAttr,
} from './properties';
import type { RenderContext, XmlNode } from './types';

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

interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

interface Hsv {
	h: number;
	s: number;
	v: number;
}

function parseColor(raw: string | undefined): Rgba {
	const fallback = { r: 124, g: 58, b: 237, a: 1 };
	if (!raw || isMarkupExtension(raw)) {
		return fallback;
	}
	const value = raw.trim();
	const hex8 = /^#([0-9A-Fa-f]{8})$/.exec(value);
	if (hex8) {
		const hex = hex8[1];
		return {
			a: parseInt(hex.slice(0, 2), 16) / 255,
			r: parseInt(hex.slice(2, 4), 16),
			g: parseInt(hex.slice(4, 6), 16),
			b: parseInt(hex.slice(6, 8), 16),
		};
	}
	const hex6 = /^#([0-9A-Fa-f]{6})$/.exec(value);
	if (hex6) {
		const hex = hex6[1];
		return {
			r: parseInt(hex.slice(0, 2), 16),
			g: parseInt(hex.slice(2, 4), 16),
			b: parseInt(hex.slice(4, 6), 16),
			a: 1,
		};
	}
	const hex3 = /^#([0-9A-Fa-f]{3})$/.exec(value);
	if (hex3) {
		const hex = hex3[1];
		return {
			r: parseInt(hex[0] + hex[0], 16),
			g: parseInt(hex[1] + hex[1], 16),
			b: parseInt(hex[2] + hex[2], 16),
			a: 1,
		};
	}
	return fallback;
}

function rgbToHsv(color: Rgba): Hsv {
	const r = color.r / 255;
	const g = color.g / 255;
	const b = color.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	let h = 0;
	if (delta !== 0) {
		if (max === r) {
			h = ((g - b) / delta) % 6;
		} else if (max === g) {
			h = (b - r) / delta + 2;
		} else {
			h = (r - g) / delta + 4;
		}
		h *= 60;
		if (h < 0) {
			h += 360;
		}
	}
	return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;
	let r = 0;
	let g = 0;
	let b = 0;
	if (h < 60) {
		r = c;
		g = x;
	} else if (h < 120) {
		r = x;
		g = c;
	} else if (h < 180) {
		g = c;
		b = x;
	} else if (h < 240) {
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}
	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

function rgbCss(r: number, g: number, b: number, a = 1): string {
	if (a >= 1) {
		return `rgb(${r}, ${g}, ${b})`;
	}
	return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

function sliderHtml(
	kind: string,
	trackStyle: string,
	percent: number
): string {
	const left = Math.min(100, Math.max(0, percent));
	return `<div class="color-slider ${kind}"><div class="color-slider-track"${styleAttr(trackStyle)}></div><span class="color-slider-thumb" style="left: ${left}%"></span></div>`;
}

export function renderColorPicker(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const color = parseColor(getAttr(node, 'Color'));
	const hsv = rgbToHsv(color);
	const shape = (getAttr(node, 'ColorSpectrumShape') ?? 'Box').toLowerCase();
	const showPreview = isTrue(getAttr(node, 'IsColorPreviewVisible'), true);
	const showSlider = isTrue(getAttr(node, 'IsColorSliderVisible'), true);
	const showAlpha = isTrue(getAttr(node, 'IsAlphaEnabled'), false);
	const showMore = isTrue(getAttr(node, 'IsMoreButtonVisible'), true);
	const showHex = isTrue(getAttr(node, 'IsHexInputVisible'), true);
	const showChannels = isTrue(getAttr(node, 'IsColorChannelTextInputVisible'), true);
	const full = hsvToRgb(hsv.h, 1, 1);
	const selected = rgbCss(color.r, color.g, color.b, color.a);
	const fullCss = rgbCss(full.r, full.g, full.b);
	const spectrumClass = shape === 'ring' ? 'color-spectrum ring' : 'color-spectrum box';
	const thumbLeft = (hsv.h / 360) * 100;
	const thumbTop = (1 - hsv.s) * 100;

	const preview = showPreview
		? `<div class="color-preview" style="background: ${escapeHtmlAttr(selected)}"></div>`
		: '';
	const spectrum = `<div class="${spectrumClass}"><span class="spectrum-thumb" style="left: ${thumbLeft}%; top: ${thumbTop}%"></span></div>`;

	const sliders: string[] = [];
	if (showSlider) {
		sliders.push(
			sliderHtml(
				'value',
				`background: linear-gradient(to right, #000000, ${fullCss})`,
				hsv.v * 100
			)
		);
	}
	if (showAlpha) {
		sliders.push(
			sliderHtml(
				'alpha',
				`--alpha-color: ${rgbCss(color.r, color.g, color.b)}`,
				color.a * 100
			)
		);
	}

	const moreExpanded = !showMore;
	const inputs: string[] = [];
	if (moreExpanded && showHex) {
		const hex = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`.toUpperCase();
		inputs.push(`<span class="color-hex">${escapeHtmlText(hex)}</span>`);
	}
	if (moreExpanded && showChannels) {
		inputs.push(
			`<span class="color-channels">R ${color.r}  G ${color.g}  B ${color.b}</span>`
		);
	}

	const more = showMore
		? '<div class="color-more"><span>More</span><span class="color-more-chevron">&#8964;</span></div>'
		: '';

	return `<div data-xaml="ColorPicker"${styleAttr(props.style)}${props.attrs}><div class="color-picker-row">${spectrum}${preview}</div>${sliders.join('')}${inputs.join('')}${more}</div>`;
}
