import { mapAlignment, mapPropertyToCss, toCssLength } from './cssMapping';
import {
	parseAppThemeBinding,
	parseMarkupExtension,
	resolveBrushNode,
	resolveImplicitStyle,
	resolveRawValue,
	resolveResourceValue,
	resolveSelectorStyles,
	resolveStyleAttribute,
} from './styleParser';
import type { RenderContext, XmlNode } from './types';
import { getAttr, localPropName } from './xml';

const GLOBAL_STYLE_PROPS = new Set([
	'width',
	'height',
	'widthrequest',
	'heightrequest',
	'minwidth',
	'minheight',
	'maxwidth',
	'maxheight',
	'minimumwidthrequest',
	'minimumheightrequest',
	'maximumwidthrequest',
	'maximumheightrequest',
	'margin',
	'padding',
	'background',
	'backgroundcolor',
	'foreground',
	'textcolor',
	'borderthickness',
	'borderbrush',
	'bordercolor',
	'borderwidth',
	'cornerradius',
	'fontsize',
	'fontweight',
	'fontattributes',
	'fontfamily',
	'lineheight',
	'istextselectionenabled',
	'opacity',
	'horizontalalignment',
	'verticalalignment',
	'horizontaloptions',
	'verticaloptions',
	'style',
	'classes',
	'class',
	'tapped',
	'click',
	'clicked',
	'pressed',
	'released',
	'command',
	'toggled',
	'checked',
	'unchecked',
	'loaded',
	'textchanged',
	'searchbuttonpressed',
	'valuechanged',
	'datechanged',
	'selecteddatechanged',
	'timechanged',
	'selectedtimechanged',
	'closed',
	'closebuttonclick',
	'selectionchanged',
	'selectedindexchanged',
	'tooltipservice.tooltip',
	'textwrapping',
	'linebreakmode',
	'visibility',
	'isvisible',
	'tag',
]);

/** Tags that use HorizontalAlignment to align children, not the element itself. */
const CONTENT_HORIZONTAL_ALIGN_TAGS = new Set(['stackpanel', 'wrappanel']);

/** Panels that sit in the center of the parent when alignment is omitted. */
const DEFAULT_CENTER_IN_PARENT_TAGS = new Set(['canvas', 'relativepanel']);

const COLOR_PROPS = new Set([
	'background',
	'backgroundcolor',
	'foreground',
	'textcolor',
	'borderbrush',
	'fill',
	'stroke',
	'color',
]);

const TAG_SPECIFIC_PROPS: Record<string, Set<string>> = {
	stackpanel: new Set(['orientation', 'spacing']),
	verticalstacklayout: new Set(['spacing']),
	horizontalstacklayout: new Set(['spacing']),
	flexlayout: new Set([
		'direction',
		'wrap',
		'justifycontent',
		'alignitems',
		'aligncontent',
	]),
	border: new Set([
		'borderbrush',
		'borderthickness',
		'cornerradius',
		'stroke',
		'strokethickness',
		'strokeshape',
		'backgroundcolor',
	]),
	scrollviewer: new Set(['horizontalscrollmode', 'verticalscrollmode']),
	scrollview: new Set(['horizontalscrollmode', 'verticalscrollmode']),
	button: new Set([
		'content',
		'text',
		'clicked',
		'pressed',
		'released',
		'imagesource',
		'contentlayout',
		'commandparameter',
		'isenabled',
		'characterspacing',
		'fontautoscalingenabled',
	]),
	togglebutton: new Set(['content', 'ischecked']),
	hyperlinkbutton: new Set(['content', 'navigateuri']),
	textblock: new Set([
		'text',
		'textwrapping',
		'texttrimming',
		'textalignment',
		'textcolor',
		'fontattributes',
		'linebreakmode',
		'maxlines',
		'isreadonly',
	]),
	label: new Set([
		'text',
		'content',
		'textwrapping',
		'texttrimming',
		'textalignment',
		'textcolor',
		'fontattributes',
		'linebreakmode',
		'maxlines',
		'isreadonly',
	]),
	richtextblock: new Set(['istextselectionenabled', 'linestackingstrategy']),
	paragraph: new Set([]),
	run: new Set(['text']),
	textbox: new Set(['text', 'placeholdertext', 'header', 'isreadonly']),
	entry: new Set([
		'text',
		'placeholder',
		'keyboard',
		'isreadonly',
		'ispassword',
		'maxlength',
		'returntype',
		'clearbuttonvisibility',
		'placeholdercolor',
		'horizontaltextalignment',
	]),
	editor: new Set([
		'text',
		'placeholder',
		'placeholdercolor',
		'keyboard',
		'isreadonly',
		'maxlength',
		'autosize',
		'horizontaltextalignment',
		'verticaltextalignment',
		'isspellcheckenabled',
		'istextpredictionenabled',
	]),
	autosuggestbox: new Set(['text', 'placeholdertext', 'header']),
	searchbar: new Set([
		'text',
		'placeholder',
		'placeholdercolor',
		'keyboard',
		'cancelbuttoncolor',
		'searchbuttonpressed',
		'searchcommand',
		'horizontaltextalignment',
		'isspellcheckenabled',
		'istextpredictionenabled',
		'characterspacing',
		'fontautoscalingenabled',
	]),
	toggleswitch: new Set(['header', 'oncontent', 'offcontent', 'ison']),
	switch: new Set([
		'istoggled',
		'ison',
		'oncolor',
		'offcolor',
		'thumbcolor',
		'oncontent',
		'offcontent',
		'header',
	]),
	passwordbox: new Set([
		'header',
		'placeholdertext',
		'password',
		'passwordrevealmode',
		'maxlength',
	]),
	numberbox: new Set([
		'header',
		'placeholdertext',
		'value',
		'minimum',
		'maximum',
		'smallchange',
		'largechange',
		'spinbuttonplacementmode',
	]),
	numericupdown: new Set([
		'header',
		'watermark',
		'placeholdertext',
		'value',
		'text',
		'minimum',
		'maximum',
		'increment',
		'formatstring',
		'culture',
		'showbuttonspinner',
		'buttonspinnerlocation',
		'horizontalcontentalignment',
		'isreadonly',
		'allowspin',
	]),
	stepper: new Set(['value', 'minimum', 'maximum', 'increment']),
	combobox: new Set([
		'header',
		'placeholdertext',
		'selectedindex',
		'selecteditem',
		'iseditable',
		'itemssource',
	]),
	picker: new Set([
		'title',
		'titlecolor',
		'selectedindex',
		'selecteditem',
		'itemssource',
		'itemdisplaybinding',
		'selectedindexchanged',
		'horizontaltextalignment',
		'verticaltextalignment',
		'texttransform',
		'characterspacing',
		'fontautoscalingenabled',
	]),
	comboboxitem: new Set(['content', 'isselected']),
	slider: new Set([
		'header',
		'value',
		'minimum',
		'maximum',
		'stepfrequency',
		'tickfrequency',
		'tickplacement',
		'orientation',
	]),
	radiobutton: new Set(['content', 'groupname', 'ischecked']),
	checkbox: new Set(['content', 'ischecked', 'isthreestate']),
	ratingcontrol: new Set([
		'caption',
		'maxrating',
		'value',
		'placeholdervalue',
		'isclearenabled',
		'isreadonly',
	]),
	infobar: new Set([
		'title',
		'message',
		'severity',
		'isopen',
		'isclosable',
	]),
	'infobar.actionbutton': new Set([]),
	grid: new Set([
		'grid.row',
		'grid.column',
		'grid.rowspan',
		'grid.columnspan',
		'rowspacing',
		'columnspacing',
		'rowdefinitions',
		'columndefinitions',
		'grid.rowdefinitions',
		'grid.columndefinitions',
	]),
	uniformgrid: new Set([
		'columns',
		'rows',
		'firstcolumn',
		'orientation',
		'rowspacing',
		'columnspacing',
	]),
	progressring: new Set(['isactive']),
	activityindicator: new Set(['isrunning', 'isactive', 'color']),
	progressbar: new Set([
		'value',
		'progress',
		'progresscolor',
		'minimum',
		'maximum',
		'showpaused',
		'showerror',
		'isindeterminate',
	]),
	datepicker: new Set([
		'header',
		'dayvisible',
		'monthvisible',
		'yearvisible',
		'date',
		'selecteddate',
		'minyear',
		'maxyear',
		'format',
	]),
	timepicker: new Set([
		'header',
		'clockidentifier',
		'minuteincrement',
		'time',
		'selectedtime',
		'format',
	]),
	fonticon: new Set(['glyph']),
	listview: new Set([
		'header',
		'selectedindex',
		'selecteditem',
		'selectionmode',
		'itemssource',
		'itemtemplate',
		'itemclick',
		'isitemclickenabled',
	]),
	listviewitem: new Set(['content', 'isselected']),
	'listview.header': new Set([]),
	'listview.itemtemplate': new Set([]),
	listbox: new Set([
		'selectedindex',
		'selecteditem',
		'selectionmode',
		'itemssource',
		'itemtemplate',
	]),
	listboxitem: new Set(['content', 'isselected']),
	'listbox.items': new Set([]),
	'listbox.itemtemplate': new Set([]),
	navigationview: new Set([
		'isbackbuttonvisible',
		'issettingsvisible',
		'openpanelength',
		'panedisplaymode',
		'selecteditem',
		'selectionchanged',
	]),
	'navigationview.menuitems': new Set([]),
	navigationviewitem: new Set(['content', 'tag']),
	'navigationviewitem.icon': new Set([]),
	datatemplate: new Set([]),
	ellipse: new Set(['fill', 'stroke', 'strokethickness']),
	line: new Set([
		'x1',
		'y1',
		'x2',
		'y2',
		'stroke',
		'strokethickness',
		'strokelinecap',
		'strokelinejoin',
		'strokedasharray',
		'strokedashoffset',
		'strokemiterlimit',
	]),
	canvas: new Set([]),
	'canvas.resources': new Set([]),
	dockpanel: new Set(['lastchildfill']),
	'dockpanel.resources': new Set([]),
	wrappanel: new Set(['orientation', 'itemwidth', 'itemheight']),
	'wrappanel.resources': new Set([]),
	relativepanel: new Set([]),
	'relativepanel.resources': new Set([]),
	splitview: new Set([
		'panebackground',
		'ispaneopen',
		'openpanelength',
		'compactpanelength',
		'displaymode',
		'paneplacement',
	]),
	'splitview.pane': new Set([]),
	'splitview.content': new Set([]),
	rectangle: new Set([
		'fill',
		'stroke',
		'strokethickness',
		'radiusx',
		'radiusy',
	]),
	personpicture: new Set(['displayname', 'initials', 'profilepicture']),
	image: new Set(['source', 'stretch', 'aspect']),
	imagebutton: new Set([
		'source',
		'stretch',
		'aspect',
		'clicked',
		'pressed',
		'released',
		'commandparameter',
		'isenabled',
	]),
	calendardatepicker: new Set([
		'header',
		'placeholdertext',
		'dateformat',
		'date',
		'selecteddate',
	]),
	calendarview: new Set([
		'selectionmode',
		'isoutofscopeenabled',
		'istodayhighlighted',
		'isgrouplabelvisible',
		'displaydate',
		'selecteddate',
	]),
	colorpicker: new Set([
		'color',
		'colorspectrumshape',
		'isalphaenabled',
		'iscolorslidervisible',
		'iscolorchanneltextinputvisible',
		'ishexinputvisible',
		'iscolorpreviewvisible',
		'ismorebuttonvisible',
	]),
	expander: new Set([
		'header',
		'isexpanded',
		'horizontalcontentalignment',
	]),
	'expander.header': new Set([]),
	splitbutton: new Set(['content']),
	'splitbutton.flyout': new Set([]),
	dropdownbutton: new Set(['content']),
	'dropdownbutton.flyout': new Set([]),
	repeatbutton: new Set(['content', 'delay', 'interval']),
	togglesplitbutton: new Set(['content', 'ischecked']),
	'togglesplitbutton.flyout': new Set([]),
	menuflyout: new Set([]),
	menuflyoutitem: new Set(['text']),
	menuflyoutseparator: new Set([]),
	commandbar: new Set(['defaultlabelposition', 'overflowbuttonvisibility']),
	'commandbar.secondarycommands': new Set([]),
	appbarbutton: new Set(['icon', 'label']),
	menubar: new Set([]),
	menubaritem: new Set(['title']),
	gridview: new Set([
		'header',
		'selectedindex',
		'selecteditem',
		'selectionmode',
		'itemssource',
	]),
	gridviewitem: new Set(['content', 'isselected']),
	'gridview.header': new Set([]),
	tabview: new Set([
		'isaddtabbuttonvisible',
		'tabwidthmode',
		'selectedindex',
	]),
	tabviewitem: new Set(['header', 'isselected']),
	richeditbox: new Set([
		'text',
		'placeholdertext',
		'header',
		'acceptsreturn',
		'textwrapping',
	]),
	flipview: new Set([
		'selectedindex',
		'itemssource',
		'borderbrush',
		'borderthickness',
	]),
	flipviewitem: new Set(['content']),
	'flipview.itemtemplate': new Set([]),
	'flipview.itemspanel': new Set([]),
	'flipview.items': new Set([]),
	pipspager: new Set([
		'numberofpages',
		'selectedpageindex',
		'maxvisiblepips',
		'previousbuttonvisibility',
		'nextbuttonvisibility',
	]),
	indicatorview: new Set([
		'count',
		'position',
		'indicatorcolor',
		'selectedindicatorcolor',
		'indicatorsize',
		'indicatorsshape',
		'maximumvisible',
		'hidesingle',
		'itemssource',
	]),
	radiobuttons: new Set(['header', 'selectedindex', 'maxcolumns']),
	selectorbar: new Set([]),
	selectorbaritem: new Set(['text', 'icon', 'isselected']),
	viewbox: new Set(['stretch', 'stretchdirection']),
	absolutelayout: new Set([]),
	boxview: new Set(['color']),
	webview: new Set(['source', 'cookies', 'useragent']),
	htmlwebviewsource: new Set(['html', 'baseurl']),
	urlwebviewsource: new Set(['url']),
	'webview.source': new Set([]),
	'htmlwebviewsource.html': new Set([]),
	'viewbox.child': new Set([]),
	contentcontrol: new Set(['content']),
	page: new Set([]),
	contentpage: new Set(['title']),
	usercontrol: new Set([]),
	window: new Set(['title', 'windowstartuplocation']),
	rowdefinition: new Set(['height', 'width']),
	columndefinition: new Set(['height', 'width']),
};

export interface ProcessedProperties {
	style: string;
	/** Extra HTML attributes including leading space, e.g. ` data-tooltip="..."`. */
	attrs: string;
}

/** Props that any element inside a Grid may carry (attached properties). */
const GRID_ATTACHED_PROPS = new Set([
	'grid.row',
	'grid.column',
	'grid.rowspan',
	'grid.columnspan',
]);

/** Props that any element inside a Canvas may carry (attached properties). */
const CANVAS_ATTACHED_PROPS = new Set([
	'canvas.left',
	'canvas.top',
	'canvas.right',
	'canvas.bottom',
	'canvas.zindex',
]);

const DOCK_PANEL_ATTACHED_PROPS = new Set(['dockpanel.dock']);

const ABSOLUTE_LAYOUT_ATTACHED_PROPS = new Set([
	'absolutelayout.layoutbounds',
	'absolutelayout.layoutflags',
]);

const FLEX_LAYOUT_ATTACHED_PROPS = new Set([
	'flexlayout.grow',
	'flexlayout.shrink',
	'flexlayout.basis',
	'flexlayout.alignself',
	'flexlayout.order',
]);

const RELATIVE_PANEL_ATTACHED_PROPS = new Set([
	'relativepanel.leftof',
	'relativepanel.rightof',
	'relativepanel.above',
	'relativepanel.below',
	'relativepanel.alignleftwith',
	'relativepanel.aligntopwith',
	'relativepanel.alignrightwith',
	'relativepanel.alignbottomwith',
	'relativepanel.alignhorizontalcenterwith',
	'relativepanel.alignverticalcenterwith',
	'relativepanel.alignleftwithpanel',
	'relativepanel.aligntopwithpanel',
	'relativepanel.alignrightwithpanel',
	'relativepanel.alignbottomwithpanel',
	'relativepanel.alignhorizontalcenterwithpanel',
	'relativepanel.alignverticalcenterwithpanel',
]);

function isIgnorableAttribute(name: string): boolean {
	const n = name.startsWith('@_') ? name.slice(2) : name;
	const lower = n.toLowerCase();
	if (lower === 'xmlns' || lower.startsWith('xmlns:')) {
		return true;
	}
	if (lower.startsWith('xml:')) {
		return true;
	}
	if (localPropName(n).toLowerCase().startsWith('semanticproperties')) {
		return true;
	}
	const colon = n.indexOf(':');
	if (colon >= 0) {
		const prefix = n.slice(0, colon).toLowerCase();
		if (prefix === 'x' || prefix === 'xml' || prefix === 'mc') {
			return true;
		}
	}
	return false;
}

function isKnownProperty(tagLocalName: string, propLocalLower: string): boolean {
	if (GLOBAL_STYLE_PROPS.has(propLocalLower) || propLocalLower.startsWith('classes.')) {
		return true;
	}
	const specific = TAG_SPECIFIC_PROPS[tagLocalName];
	if (specific?.has(propLocalLower)) {
		return true;
	}
	if (GRID_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	if (CANVAS_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	if (RELATIVE_PANEL_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	if (DOCK_PANEL_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	if (ABSOLUTE_LAYOUT_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	if (FLEX_LAYOUT_ATTACHED_PROPS.has(propLocalLower)) {
		return true;
	}
	return false;
}

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

function resolveCssValue(
	rawValue: string,
	ctx: RenderContext,
	node: XmlNode,
	tooltipParts: string[]
): string | undefined {
	const me = parseMarkupExtension(rawValue);
	if (me) {
		const resolved = ctx.styleRegistry
			? resolveResourceValue(
					me.key,
					ctx.styleRegistry,
					new Set(),
					ctx.colorScheme ?? 'dark'
				)
			: undefined;
		if (resolved !== undefined) {
			return resolved;
		}
		ctx.hasUnknown.value = true;
		ctx.output.appendLine(`Unknown resource: [${me.key}] : [${node.line}]`);
		tooltipParts.push(rawValue.trim());
		return undefined;
	}
	const theme = parseAppThemeBinding(rawValue);
	if (theme) {
		const scheme = ctx.colorScheme ?? 'dark';
		const chosen =
			scheme === 'dark'
				? theme.dark ?? theme.default ?? theme.light
				: theme.light ?? theme.default ?? theme.dark;
		if (chosen) {
			return resolveCssValue(chosen, ctx, node, tooltipParts);
		}
		tooltipParts.push(rawValue.trim());
		return undefined;
	}
	if (isMarkupExtension(rawValue)) {
		const fallback = parseFallbackValue(rawValue);
		if (fallback) {
			const fromFallback = resolveCssValue(fallback, ctx, node, tooltipParts);
			if (fromFallback !== undefined) {
				return fromFallback;
			}
		}
		tooltipParts.push(rawValue.trim());
		return undefined;
	}
	return resolveRawValue(
		rawValue,
		ctx.styleRegistry,
		new Set(),
		ctx.colorScheme ?? 'dark'
	);
}

function propertyElementName(
	parent: XmlNode,
	child: XmlNode
): string | undefined {
	const prefix = `${parent.localName}.`;
	if (child.localName.startsWith(prefix)) {
		return child.localName.slice(prefix.length);
	}
	return undefined;
}

function applyColorPropertyElements(
	node: XmlNode,
	styles: Record<string, string>,
	ctx: RenderContext,
	tooltipParts: string[]
): void {
	for (const child of node.children) {
		const prop = propertyElementName(node, child);
		if (!prop || !COLOR_PROPS.has(prop)) {
			continue;
		}
		if (getAttr(node, prop) !== undefined) {
			continue;
		}
		const fromBrush = resolveBrushNode(
			child,
			ctx.styleRegistry,
			new Set(),
			ctx.colorScheme ?? 'dark'
		);
		if (fromBrush) {
			Object.assign(styles, mapPropertyToCss(prop, fromBrush).styles);
			continue;
		}
		const text = child.text.trim();
		if (text) {
			const resolved = resolveCssValue(text, ctx, node, tooltipParts);
			if (resolved) {
				Object.assign(styles, mapPropertyToCss(prop, resolved).styles);
			}
		}
	}
}

/**
 * Reports unknown properties and returns CSS + extra HTML attrs (e.g. title tooltip).
 */
export function processProperties(
	node: XmlNode,
	ctx: RenderContext
): ProcessedProperties {
	const styles: Record<string, string> = {};
	let horizontal: string | undefined;
	let vertical: string | undefined;
	const tooltipParts: string[] = [];
	let serviceTooltip: string | undefined;

	const styleValue = getAttr(node, 'Style');
	if (!styleValue) {
		const fromImplicit = resolveImplicitStyle(node.localName, ctx);
		Object.assign(styles, fromImplicit.styles);
		horizontal = fromImplicit.horizontal;
		vertical = fromImplicit.vertical;
	}

	const fromSelectors = resolveSelectorStyles(node, ctx);
	Object.assign(styles, fromSelectors.styles);
	horizontal = fromSelectors.horizontal ?? horizontal;
	vertical = fromSelectors.vertical ?? vertical;

	if (styleValue) {
		const fromStyle = resolveStyleAttribute(styleValue, ctx, node.line);
		Object.assign(styles, fromStyle.styles);
		horizontal = fromStyle.horizontal ?? horizontal;
		vertical = fromStyle.vertical ?? vertical;
	}

	for (const [rawName, rawValue] of Object.entries(node.attributes)) {
		if (isIgnorableAttribute(rawName)) {
			continue;
		}

		const propName = localPropName(rawName);
		const propLower = propName.toLowerCase();

		if (!isKnownProperty(node.localName, propLower)) {
			ctx.hasUnknown.value = true;
			ctx.output.appendLine(
				`Unknown property: [${node.tagName}] > [${propName}] : [${node.line}]`
			);
			continue;
		}

		if (
			propLower === 'style' ||
			propLower === 'classes' ||
			propLower === 'class' ||
			propLower.startsWith('classes.') ||
			propLower === 'content' ||
			propLower === 'text' ||
			propLower === 'placeholdertext' ||
			propLower === 'placeholder' ||
			propLower === 'keyboard' ||
			propLower === 'ispassword' ||
			propLower === 'returntype' ||
			propLower === 'clearbuttonvisibility' ||
			propLower === 'placeholdercolor' ||
			propLower === 'cancelbuttoncolor' ||
			propLower === 'horizontaltextalignment' ||
			propLower === 'verticaltextalignment' ||
			propLower === 'autosize' ||
			propLower === 'isspellcheckenabled' ||
			propLower === 'istextpredictionenabled' ||
			propLower === 'imagesource' ||
			propLower === 'contentlayout' ||
			propLower === 'commandparameter' ||
			propLower === 'isenabled' ||
			propLower === 'characterspacing' ||
			propLower === 'fontautoscalingenabled' ||
			propLower === 'password' ||
			propLower === 'passwordrevealmode' ||
			propLower === 'maxlength' ||
			propLower === 'header' ||
			propLower === 'value' ||
			propLower === 'progress' ||
			propLower === 'progresscolor' ||
			propLower === 'minimum' ||
			propLower === 'maximum' ||
			propLower === 'increment' ||
			propLower === 'smallchange' ||
			propLower === 'largechange' ||
			propLower === 'spinbuttonplacementmode' ||
			propLower === 'selectedindex' ||
			propLower === 'selecteditem' ||
			propLower === 'selectionmode' ||
			propLower === 'iseditable' ||
			propLower === 'isselected' ||
			propLower === 'stepfrequency' ||
			propLower === 'tickfrequency' ||
			propLower === 'tickplacement' ||
			propLower === 'oncontent' ||
			propLower === 'offcontent' ||
			propLower === 'ison' ||
			propLower === 'istoggled' ||
			propLower === 'oncolor' ||
			propLower === 'offcolor' ||
			propLower === 'thumbcolor' ||
			propLower === 'ischecked' ||
			propLower === 'isthreestate' ||
			propLower === 'groupname' ||
			propLower === 'texttrimming' ||
			propLower === 'maxlines' ||
			propLower === 'orientation' ||
			propLower === 'spacing' ||
			propLower === 'rowspacing' ||
			propLower === 'columnspacing' ||
			propLower === 'rowdefinitions' ||
			propLower === 'columndefinitions' ||
			propLower === 'grid.rowdefinitions' ||
			propLower === 'grid.columndefinitions' ||
			propLower === 'columns' ||
			propLower === 'rows' ||
			propLower === 'firstcolumn' ||
			propLower === 'itemwidth' ||
			propLower === 'itemheight' ||
			propLower === 'lastchildfill' ||
			propLower === 'isactive' ||
			propLower === 'isrunning' ||
			propLower === 'isindeterminate' ||
			propLower === 'showpaused' ||
			propLower === 'showerror' ||
			propLower === 'dayvisible' ||
			propLower === 'monthvisible' ||
			propLower === 'yearvisible' ||
			propLower === 'date' ||
			propLower === 'selecteddate' ||
			propLower === 'minyear' ||
			propLower === 'maxyear' ||
			propLower === 'clockidentifier' ||
			propLower === 'minuteincrement' ||
			propLower === 'time' ||
			propLower === 'selectedtime' ||
			propLower === 'caption' ||
			propLower === 'maxrating' ||
			propLower === 'placeholdervalue' ||
			propLower === 'isclearenabled' ||
			propLower === 'isreadonly' ||
			propLower === 'title' ||
			propLower === 'titlecolor' ||
			propLower === 'itemdisplaybinding' ||
			propLower === 'texttransform' ||
			propLower === 'windowstartuplocation' ||
			propLower === 'message' ||
			propLower === 'severity' ||
			propLower === 'isopen' ||
			propLower === 'isclosable' ||
			propLower === 'horizontalscrollmode' ||
			propLower === 'verticalscrollmode' ||
			propLower === 'isbackbuttonvisible' ||
			propLower === 'issettingsvisible' ||
			propLower === 'openpanelength' ||
			propLower === 'compactpanelength' ||
			propLower === 'panebackground' ||
			propLower === 'ispaneopen' ||
			propLower === 'displaymode' ||
			propLower === 'paneplacement' ||
			propLower === 'itemtemplate' ||
			propLower === 'isitemclickenabled' ||
			propLower === 'panedisplaymode' ||
			propLower === 'tag' ||
			propLower === 'displayname' ||
			propLower === 'initials' ||
			propLower === 'profilepicture' ||
			propLower === 'source' ||
			propLower === 'cookies' ||
			propLower === 'useragent' ||
			propLower === 'stretch' ||
			propLower === 'aspect' ||
			propLower === 'stretchdirection' ||
			propLower === 'dateformat' ||
			propLower === 'format' ||
			propLower === 'isoutofscopeenabled' ||
			propLower === 'istodayhighlighted' ||
			propLower === 'isgrouplabelvisible' ||
			propLower === 'displaydate' ||
			propLower === 'color' ||
			propLower === 'colorspectrumshape' ||
			propLower === 'isalphaenabled' ||
			propLower === 'iscolorslidervisible' ||
			propLower === 'iscolorchanneltextinputvisible' ||
			propLower === 'ishexinputvisible' ||
			propLower === 'iscolorpreviewvisible' ||
			propLower === 'ismorebuttonvisible' ||
			propLower === 'isexpanded' ||
			propLower === 'horizontalcontentalignment' ||
			propLower === 'delay' ||
			propLower === 'interval' ||
			propLower === 'defaultlabelposition' ||
			propLower === 'overflowbuttonvisibility' ||
			propLower === 'icon' ||
			propLower === 'label' ||
			propLower === 'isaddtabbuttonvisible' ||
			propLower === 'tabwidthmode' ||
			propLower === 'acceptsreturn' ||
			propLower === 'numberofpages' ||
			propLower === 'selectedpageindex' ||
			propLower === 'maxvisiblepips' ||
			propLower === 'previousbuttonvisibility' ||
			propLower === 'nextbuttonvisibility' ||
			propLower === 'count' ||
			propLower === 'position' ||
			propLower === 'indicatorcolor' ||
			propLower === 'selectedindicatorcolor' ||
			propLower === 'indicatorsize' ||
			propLower === 'indicatorsshape' ||
			propLower === 'maximumvisible' ||
			propLower === 'hidesingle' ||
			propLower === 'direction' ||
			propLower === 'wrap' ||
			propLower === 'justifycontent' ||
			propLower === 'alignitems' ||
			propLower === 'aligncontent' ||
			propLower === 'x1' ||
			propLower === 'y1' ||
			propLower === 'x2' ||
			propLower === 'y2' ||
			propLower === 'strokelinecap' ||
			propLower === 'strokelinejoin' ||
			propLower === 'strokedasharray' ||
			propLower === 'strokedashoffset' ||
			propLower === 'strokemiterlimit' ||
			propLower === 'maxcolumns' ||
			propLower === 'linestackingstrategy' ||
			propLower === 'radiusx' ||
			propLower === 'radiusy' ||
			propLower === 'visibility' ||
			propLower === 'isvisible' ||
			GRID_ATTACHED_PROPS.has(propLower) ||
			CANVAS_ATTACHED_PROPS.has(propLower) ||
			RELATIVE_PANEL_ATTACHED_PROPS.has(propLower) ||
			DOCK_PANEL_ATTACHED_PROPS.has(propLower) ||
			ABSOLUTE_LAYOUT_ATTACHED_PROPS.has(propLower)
		) {
			continue;
		}

		switch (propLower) {
			case 'tapped':
			case 'click':
			case 'clicked':
			case 'pressed':
			case 'released':
			case 'itemssource':
			case 'command':
			case 'toggled':
			case 'checked':
			case 'unchecked':
			case 'loaded':
			case 'textchanged':
			case 'searchbuttonpressed':
			case 'searchcommand':
			case 'valuechanged':
			case 'datechanged':
			case 'selecteddatechanged':
			case 'timechanged':
			case 'selectedtimechanged':
			case 'closed':
			case 'closebuttonclick':
			case 'selectionchanged':
			case 'selectedindexchanged':
			case 'itemclick':
			case 'navigateuri':
				if (rawValue.trim()) {
					tooltipParts.push(`${propName}: ${rawValue.trim()}`);
				}
				break;
			case 'tooltipservice.tooltip':
				if (rawValue.trim()) {
					serviceTooltip = rawValue.trim();
				}
				break;
			case 'glyph':
			case 'selecteditem':
				if (isMarkupExtension(rawValue)) {
					tooltipParts.push(rawValue.trim());
				}
				break;
			default: {
				const value = resolveCssValue(rawValue, ctx, node, tooltipParts);
				if (value === undefined) {
					break;
				}
				const mapped = mapPropertyToCss(propLower, value);
				Object.assign(styles, mapped.styles);
				if (mapped.horizontal !== undefined) {
					horizontal = mapped.horizontal;
				}
				if (mapped.vertical !== undefined) {
					vertical = mapped.vertical;
				}
				break;
			}
		}
	}

	applyColorPropertyElements(node, styles, ctx, tooltipParts);

	if (DEFAULT_CENTER_IN_PARENT_TAGS.has(node.localName)) {
		if (getAttr(node, 'HorizontalAlignment') === undefined) {
			horizontal = 'center';
		}
		if (getAttr(node, 'VerticalAlignment') === undefined) {
			vertical = 'center';
		}
	}
	const insideWrapPanel = node.parent?.localName === 'wrappanel';
	const selfHorizontal =
		CONTENT_HORIZONTAL_ALIGN_TAGS.has(node.localName) || insideWrapPanel
			? undefined
			: horizontal;
	if (styles['height'] !== undefined && vertical === undefined) {
		vertical = 'center';
	}
	const alignmentStyles = mapAlignment(selfHorizontal, vertical);
	// Explicit Width wins over alignment's fit-content / 100%.
	if (styles['width'] !== undefined) {
		delete alignmentStyles['width'];
	}
	if (styles['max-width'] !== undefined) {
		delete alignmentStyles['max-width'];
	}
	Object.assign(styles, alignmentStyles);

	const style = Object.entries(styles)
		.map(([k, v]) => `${k}: ${v}`)
		.join('; ');

	const attrParts = [` data-element-line="${node.line}"`];
	if (tooltipParts.length) {
		attrParts.push(` data-tooltip="${escapeHtmlAttr(tooltipParts.join('\n'))}"`);
	}
	if (serviceTooltip) {
		attrParts.push(
			` data-tooltip-italic="${escapeHtmlAttr(serviceTooltip)}"`
		);
	}

	return { style, attrs: attrParts.join('') };
}

export function styleAttr(style: string): string {
	return style ? ` style="${escapeHtmlAttr(style)}"` : '';
}

export function hasCssProperty(style: string, prop: string): boolean {
	return new RegExp(`(?:^|;\\s*)${prop}\\s*:`, 'i').test(style);
}

/**
 * Layout host for input controls so they can fill the parent while still
 * honoring Margin (inner flex item) and explicit Width/Height.
 */
export function inputHostStyle(contentStyle: string): string {
	return [
		'display: flex',
		'flex-direction: column',
		'min-width: 0',
		'min-height: 0',
		'box-sizing: border-box',
		hasCssProperty(contentStyle, 'width') ? '' : 'width: 100%',
		hasCssProperty(contentStyle, 'height') ? '' : 'height: 100%',
	]
		.filter(Boolean)
		.join('; ');
}

export function inputFillStyle(contentStyle: string): string {
	return [
		hasCssProperty(contentStyle, 'height') ? '' : 'flex: 1 1 auto',
		'align-self: stretch',
		'min-width: 0',
		'box-sizing: border-box',
		'margin: 0',
		contentStyle,
	]
		.filter(Boolean)
		.join('; ');
}

export function isMarkupExtension(value: string): boolean {
	return /^\s*\{[\s\S]+\}\s*$/.test(value);
}

/**
 * Hidden and out of layout: WinUI Visibility=Collapsed or Avalonia IsVisible=False.
 */
export function isCollapsed(node: XmlNode): boolean {
	const visibility = getAttr(node, 'Visibility');
	if (
		visibility &&
		!isMarkupExtension(visibility) &&
		visibility.trim().toLowerCase() === 'collapsed'
	) {
		return true;
	}
	const isVisible = getAttr(node, 'IsVisible');
	if (
		isVisible &&
		!isMarkupExtension(isVisible) &&
		isVisible.trim().toLowerCase() === 'false'
	) {
		return true;
	}
	return false;
}

export function escapeHtmlAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function escapeHtmlText(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function headerHtml(header: string | undefined): string {
	const text = header?.trim();
	return text ? `<span class="input-header">${escapeHtmlText(text)}</span>` : '';
}

export { getAttr, localPropName, toCssLength };
