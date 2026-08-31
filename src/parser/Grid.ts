import {
	getAttr,
	isCollapsed,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isGridPropertyElement(node: XmlNode, suffix: string): boolean {
	const lower = node.localName;
	return (
		lower === `grid.${suffix}` ||
		lower === suffix ||
		lower.endsWith(`.${suffix}`)
	);
}

function parseIntAttr(node: XmlNode, name: string, fallback: number): number {
	const raw = getAttr(node, name);
	if (raw === undefined) {
		return fallback;
	}
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? n : fallback;
}

/**
 * Maps a GridLength (RowDefinition.Height / ColumnDefinition.Width) to a CSS
 * grid track. Star (`*` / `n*`) takes remaining space, Auto sizes to content,
 * and numeric values become pixels. Omitted values default to star, matching WinUI.
 */
function toGridTrack(value: string | undefined): string {
	const v = (value ?? '').trim();
	if (!v) {
		return 'minmax(0, 1fr)';
	}
	if (/^auto$/i.test(v)) {
		return 'auto';
	}
	const star = /^(\d+(?:\.\d+)?)?\*$/.exec(v);
	if (star) {
		const factor = star[1] ? Number.parseFloat(star[1]) : 1;
		if (!Number.isFinite(factor) || factor < 0) {
			return 'minmax(0, 1fr)';
		}
		return `minmax(0, ${factor}fr)`;
	}
	return toCssLength(v) ?? 'auto';
}

/**
 * WinUI / MAUI shorthand: RowDefinitions="*,Auto" or "Auto, *, 2*".
 * Comma-separated is the documented form; whitespace is also accepted.
 */
function parseDefinitionList(raw: string | undefined): string[] {
	const trimmed = raw?.trim();
	if (!trimmed) {
		return [];
	}
	const parts = trimmed.includes(',')
		? trimmed.split(',')
		: trimmed.split(/\s+/);
	return parts.map((part) => part.trim()).filter(Boolean);
}

function getDefinitionAttr(
	node: XmlNode,
	name: 'RowDefinitions' | 'ColumnDefinitions'
): string | undefined {
	return getAttr(node, name) ?? getAttr(node, `Grid.${name}`);
}

export function renderGrid(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);

	let rowDefs: XmlNode[] = [];
	let colDefs: XmlNode[] = [];
	const contentChildren: XmlNode[] = [];

	for (const child of node.children) {
		if (isGridPropertyElement(child, 'rowdefinitions')) {
			rowDefs = child.children.filter((c) => c.localName === 'rowdefinition');
			for (const def of rowDefs) {
				processProperties(def, ctx);
			}
			continue;
		}
		if (isGridPropertyElement(child, 'columndefinitions')) {
			colDefs = child.children.filter((c) => c.localName === 'columndefinition');
			for (const def of colDefs) {
				processProperties(def, ctx);
			}
			continue;
		}
		contentChildren.push(child);
	}

	const rowTracksList = rowDefs.length
		? rowDefs.map((d) => toGridTrack(getAttr(d, 'Height')))
		: parseDefinitionList(getDefinitionAttr(node, 'RowDefinitions')).map(
				toGridTrack
			);
	const colTracksList = colDefs.length
		? colDefs.map((d) => toGridTrack(getAttr(d, 'Width')))
		: parseDefinitionList(getDefinitionAttr(node, 'ColumnDefinitions')).map(
				toGridTrack
			);

	const rowCount = Math.max(rowTracksList.length, 1);
	const colCount = Math.max(colTracksList.length, 1);

	const rowTracks = rowTracksList.length
		? rowTracksList.join(' ')
		: 'minmax(0, 1fr)';
	const colTracks = colTracksList.length
		? colTracksList.join(' ')
		: 'minmax(0, 1fr)';

	const rowSpacing = getAttr(node, 'RowSpacing');
	const columnSpacing = getAttr(node, 'ColumnSpacing');
	const rowSpacingCss = rowSpacing ? toCssLength(rowSpacing) : undefined;
	const columnSpacingCss = columnSpacing
		? toCssLength(columnSpacing)
		: undefined;

	const gridStyle = [
		'display: grid',
		`grid-template-rows: ${rowTracks}`,
		`grid-template-columns: ${colTracks}`,
		'width: 100%',
		'height: 100%',
		'box-sizing: border-box',
		'min-width: 0',
		'min-height: 0',
		rowSpacingCss ? `row-gap: ${rowSpacingCss}` : '',
		columnSpacingCss ? `column-gap: ${columnSpacingCss}` : '',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	let itemsHtml = '';
	for (const child of contentChildren) {
		if (isCollapsed(child)) {
			continue;
		}
		const row = Math.min(
			Math.max(parseIntAttr(child, 'Grid.Row', 0), 0),
			rowCount - 1
		);
		const col = Math.min(
			Math.max(parseIntAttr(child, 'Grid.Column', 0), 0),
			colCount - 1
		);
		const rowSpan = Math.max(parseIntAttr(child, 'Grid.RowSpan', 1), 1);
		const colSpan = Math.max(parseIntAttr(child, 'Grid.ColumnSpan', 1), 1);

		const cellStyle = [
			`grid-row: ${row + 1} / span ${rowSpan}`,
			`grid-column: ${col + 1} / span ${colSpan}`,
			'min-width: 0',
			'min-height: 0',
			'display: grid',
			'grid-template-rows: minmax(0, 1fr)',
			'grid-template-columns: minmax(0, 1fr)',
		].join('; ');

		itemsHtml += `<div${styleAttr(cellStyle)}>${ctx.renderNode(child)}</div>`;
	}

	return `<div data-xaml="Grid"${styleAttr(gridStyle)}${props.attrs}>${itemsHtml}</div>`;
}
