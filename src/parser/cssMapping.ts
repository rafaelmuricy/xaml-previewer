export interface MappedCss {
	styles: Record<string, string>;
	horizontal?: string;
	vertical?: string;
}

export function toCssLength(value: string): string | undefined {
	const v = value.trim();
	if (!v || /^auto$/i.test(v)) {
		return undefined;
	}
	if (v === '*') {
		return '100%';
	}
	if (/^\d+(\.\d+)?$/.test(v)) {
		return `${v}px`;
	}
	if (/^\d+(\.\d+)?\*$/.test(v)) {
		return '100%';
	}
	return v;
}

export function toCssSpacing(value: string): string {
	return value
		.split(',')
		.map((part) => {
			const t = part.trim();
			if (/^\d+(\.\d+)?$/.test(t)) {
				return `${t}px`;
			}
			return t;
		})
		.join(' ');
}

export function mapAlignment(
	horizontal?: string,
	vertical?: string
): Record<string, string> {
	const styles: Record<string, string> = {};

	switch ((horizontal ?? '').toLowerCase()) {
		case 'left':
			styles['width'] = 'fit-content';
			styles['max-width'] = '100%';
			styles['margin-right'] = 'auto';
			styles['justify-self'] = 'start';
			break;
		case 'center':
			styles['width'] = 'fit-content';
			styles['max-width'] = '100%';
			styles['margin-left'] = 'auto';
			styles['margin-right'] = 'auto';
			styles['justify-self'] = 'center';
			break;
		case 'right':
			styles['width'] = 'fit-content';
			styles['max-width'] = '100%';
			styles['margin-left'] = 'auto';
			styles['justify-self'] = 'end';
			break;
		case 'stretch':
			styles['width'] = '100%';
			styles['justify-self'] = 'stretch';
			break;
	}

	switch ((vertical ?? '').toLowerCase()) {
		case 'top':
			styles['align-self'] = 'flex-start';
			break;
		case 'center':
			styles['align-self'] = 'center';
			break;
		case 'bottom':
			styles['align-self'] = 'flex-end';
			break;
		case 'stretch':
			styles['align-self'] = 'stretch';
			break;
	}

	return styles;
}

const DEFAULT_FONT_FAMILY = '"Segoe UI", sans-serif';

export function mapFontFamily(value: string): string {
	const v = value.trim();
	if (!v || /^XamlAutoFontFamily$/i.test(v)) {
		return DEFAULT_FONT_FAMILY;
	}
	if (v.includes(',')) {
		return v;
	}
	if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(v)) {
		return v;
	}
	if (/^["'].*["']$/.test(v)) {
		return `${v}, ${DEFAULT_FONT_FAMILY}`;
	}
	if (/\s/.test(v)) {
		return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", ${DEFAULT_FONT_FAMILY}`;
	}
	return `${v}, ${DEFAULT_FONT_FAMILY}`;
}

/** WinUI FontWeights → CSS numeric weights (CSS only understands `normal`/`bold` as names). */
const FONT_WEIGHT_MAP: Record<string, string> = {
	thin: '100',
	extralight: '200',
	ultralight: '200',
	light: '300',
	semilight: '350',
	normal: '400',
	regular: '400',
	medium: '500',
	semibold: '600',
	demibold: '600',
	bold: '700',
	extrabold: '800',
	ultrabold: '800',
	black: '900',
	heavy: '900',
	extrablack: '950',
	ultrablack: '950',
};

function mapFontWeight(value: string): string {
	const named = FONT_WEIGHT_MAP[value.toLowerCase()];
	if (named) {
		return named;
	}
	return value;
}

function mapFontAttributes(value: string): Record<string, string> {
	const flags = new Set(
		value
			.toLowerCase()
			.split(/[\s,]+/)
			.filter(Boolean)
	);
	const styles: Record<string, string> = {};
	if (flags.has('none')) {
		styles['font-weight'] = '400';
		styles['font-style'] = 'normal';
		return styles;
	}
	if (flags.has('bold')) {
		styles['font-weight'] = '700';
	}
	if (flags.has('italic')) {
		styles['font-style'] = 'italic';
	}
	return styles;
}

/**
 * MAUI CornerRadius is TopLeft, TopRight, BottomLeft, BottomRight.
 * CSS border-radius is TopLeft, TopRight, BottomRight, BottomLeft.
 */
function toCssMauiCornerRadius(value: string): string {
	const parts = value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length === 4) {
		const [topLeft, topRight, bottomLeft, bottomRight] = parts.map((part) =>
			/^\d+(\.\d+)?$/.test(part) ? `${part}px` : part
		);
		return `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
	}
	return toCssSpacing(value);
}

function mapStrokeShape(value: string): Record<string, string> {
	const match = /^(roundrectangle|rectangle|ellipse)\b(.*)$/i.exec(value.trim());
	if (!match) {
		return {};
	}
	const shape = match[1].toLowerCase();
	const rest = match[2].trim();
	if (shape === 'ellipse') {
		return { 'border-radius': '50%' };
	}
	if (shape === 'roundrectangle' && rest) {
		return { 'border-radius': toCssMauiCornerRadius(rest) };
	}
	return {};
}

function mapMauiLayoutOption(
	value: string,
	axis: 'horizontal' | 'vertical'
): { alignment: string; expand: boolean } {
	const compact = value.trim().toLowerCase().replace(/\s+/g, '');
	const expand = compact.endsWith('andexpand');
	const base = expand ? compact.slice(0, -'andexpand'.length) : compact;
	switch (base) {
		case 'start':
			return {
				alignment: axis === 'horizontal' ? 'left' : 'top',
				expand,
			};
		case 'center':
			return { alignment: 'center', expand };
		case 'end':
			return {
				alignment: axis === 'horizontal' ? 'right' : 'bottom',
				expand,
			};
		case 'fill':
		case 'stretch':
			return { alignment: 'stretch', expand };
		default:
			return { alignment: value, expand };
	}
}

/**
 * Maps a XAML property name/value to CSS. Unknown properties return empty styles.
 */
export function mapPropertyToCss(propLower: string, rawValue: string): MappedCss {
	const styles: Record<string, string> = {};
	const value = rawValue.trim();
	if (!value) {
		return { styles };
	}

	switch (propLower) {
		case 'width':
		case 'widthrequest': {
			const css = toCssLength(value);
			if (css) {
				styles['width'] = css;
			}
			break;
		}
		case 'height':
		case 'heightrequest': {
			const css = toCssLength(value);
			if (css) {
				styles['height'] = css;
			}
			break;
		}
		case 'minwidth':
		case 'minimumwidthrequest': {
			const css = toCssLength(value);
			if (css) {
				styles['min-width'] = css;
			}
			break;
		}
		case 'minheight':
		case 'minimumheightrequest': {
			const css = toCssLength(value);
			if (css) {
				styles['min-height'] = css;
			}
			break;
		}
		case 'maxwidth':
		case 'maximumwidthrequest': {
			const css = toCssLength(value);
			if (css) {
				styles['max-width'] = css;
			}
			break;
		}
		case 'maxheight':
		case 'maximumheightrequest': {
			const css = toCssLength(value);
			if (css) {
				styles['max-height'] = css;
			}
			break;
		}
		case 'margin':
			styles['margin'] = toCssSpacing(value);
			break;
		case 'padding':
			styles['padding'] = toCssSpacing(value);
			break;
		case 'background':
		case 'backgroundcolor':
			styles['background-color'] = value;
			styles['background'] = value;
			break;
		case 'foreground':
		case 'textcolor':
			styles['color'] = value;
			break;
		case 'fontattributes':
			Object.assign(styles, mapFontAttributes(value));
			break;
		case 'fontsize': {
			const css = toCssLength(value);
			if (css) {
				styles['font-size'] = css;
			}
			break;
		}
		case 'fontweight':
			styles['font-weight'] = mapFontWeight(value);
			break;
		case 'fontfamily':
			styles['font-family'] = mapFontFamily(value);
			break;
		case 'lineheight': {
			const css = toCssLength(value);
			if (css) {
				styles['line-height'] = css;
			}
			break;
		}
		case 'istextselectionenabled':
			if (/^(false|0)$/i.test(value)) {
				styles['user-select'] = 'none';
			} else {
				styles['user-select'] = 'text';
			}
			break;
		case 'opacity':
			styles['opacity'] = value;
			break;
		case 'horizontalalignment':
			return { styles, horizontal: value };
		case 'verticalalignment':
			return { styles, vertical: value };
		case 'horizontaloptions': {
			const mapped = mapMauiLayoutOption(value, 'horizontal');
			if (mapped.expand) {
				styles['flex-grow'] = '1';
			}
			return { styles, horizontal: mapped.alignment };
		}
		case 'verticaloptions': {
			const mapped = mapMauiLayoutOption(value, 'vertical');
			if (mapped.expand) {
				styles['flex-grow'] = '1';
			}
			return { styles, vertical: mapped.alignment };
		}
		case 'borderbrush':
		case 'bordercolor':
			styles['border-color'] = value;
			styles['border-style'] = 'solid';
			break;
		case 'borderthickness':
		case 'borderwidth':
			styles['border-width'] = toCssSpacing(value);
			styles['border-style'] = styles['border-style'] ?? 'solid';
			break;
		case 'cornerradius':
			styles['border-radius'] = toCssSpacing(value);
			break;
		case 'fill':
		case 'color':
			styles['background-color'] = value;
			break;
		case 'stroke':
			styles['border-color'] = value;
			styles['border-style'] = 'solid';
			break;
		case 'strokethickness': {
			const css = toCssLength(value);
			if (css) {
				styles['border-width'] = css;
			}
			styles['border-style'] = styles['border-style'] ?? 'solid';
			break;
		}
		case 'strokeshape':
			Object.assign(styles, mapStrokeShape(value));
			break;
		case 'textalignment':
			switch (value.toLowerCase()) {
				case 'left':
				case 'center':
				case 'right':
				case 'justify':
				case 'start':
				case 'end':
					styles['text-align'] = value.toLowerCase();
					// span is inline; text-align only applies to a block box.
					styles['display'] = 'block';
					break;
			}
			break;
		case 'textwrapping':
			switch (value.toLowerCase()) {
				case 'nowrap':
					styles['white-space'] = 'nowrap';
					break;
				case 'wrap':
					styles['white-space'] = 'normal';
					styles['overflow-wrap'] = 'break-word';
					break;
				case 'wrapwholewords':
					styles['white-space'] = 'normal';
					styles['overflow-wrap'] = 'normal';
					break;
			}
			break;
		case 'linebreakmode':
			switch (value.toLowerCase()) {
				case 'nowrap':
					styles['white-space'] = 'nowrap';
					break;
				case 'wordwrap':
					styles['white-space'] = 'normal';
					styles['overflow-wrap'] = 'break-word';
					break;
				case 'characterwrap':
					styles['white-space'] = 'normal';
					styles['overflow-wrap'] = 'anywhere';
					break;
				case 'tailtruncation':
				case 'headtruncation':
				case 'middletruncation':
					styles['white-space'] = 'nowrap';
					styles['overflow'] = 'hidden';
					styles['text-overflow'] = 'ellipsis';
					styles['min-width'] = '0';
					break;
			}
			break;
		case 'flexlayout.grow':
			styles['flex-grow'] = value;
			break;
		case 'flexlayout.shrink':
			styles['flex-shrink'] = value;
			break;
		case 'flexlayout.basis':
			if (/^auto$/i.test(value)) {
				styles['flex-basis'] = 'auto';
			} else {
				const css = toCssLength(value);
				if (css) {
					styles['flex-basis'] = css;
				}
			}
			break;
		case 'flexlayout.alignself':
			switch (value.toLowerCase()) {
				case 'start':
					styles['align-self'] = 'flex-start';
					break;
				case 'center':
					styles['align-self'] = 'center';
					break;
				case 'end':
					styles['align-self'] = 'flex-end';
					break;
				case 'stretch':
					styles['align-self'] = 'stretch';
					break;
				case 'auto':
					styles['align-self'] = 'auto';
					break;
			}
			break;
		case 'flexlayout.order':
			styles['order'] = value;
			break;
		case 'texttrimming':
			switch (value.toLowerCase()) {
				case 'none':
					styles['overflow'] = 'visible';
					styles['text-overflow'] = 'clip';
					break;
				case 'characterellipsis':
				case 'wordellipsis':
					styles['overflow'] = 'hidden';
					styles['text-overflow'] = 'ellipsis';
					styles['min-width'] = '0';
					break;
				case 'clip':
					styles['overflow'] = 'hidden';
					styles['text-overflow'] = 'clip';
					styles['min-width'] = '0';
					break;
			}
			break;
		default:
			break;
	}

	return { styles };
}
