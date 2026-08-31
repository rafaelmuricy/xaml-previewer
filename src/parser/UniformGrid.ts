import {
	getAttr,
	isCollapsed,
	isMarkupExtension,
	processProperties,
	styleAttr,
	toCssLength,
} from './properties';
import type { RenderContext, XmlNode } from './types';

function isUniformGridPropertyElement(node: XmlNode): boolean {
	return (
		node.localName.startsWith('uniformgrid.') ||
		node.localName.endsWith('.children')
	);
}

function parseCount(raw: string | undefined): number {
	if (!raw || isMarkupExtension(raw)) {
		return 0;
	}
	const value = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(value) && value > 0 ? value : 0;
}

function parseFirstColumn(raw: string | undefined, columns: number): number {
	if (!raw || isMarkupExtension(raw)) {
		return 0;
	}
	const value = Number.parseInt(raw.trim(), 10);
	if (!Number.isInteger(value) || value < 0) {
		return 0;
	}
	if (columns > 0 && value >= columns) {
		return 0;
	}
	return value;
}

/**
 * Resolves Rows/Columns the same way WPF / WinUI Community Toolkit / Avalonia do:
 * omitted (0) values are computed from the visible child count.
 */
function computeTracks(
	childCount: number,
	columnsAttr: number,
	rowsAttr: number,
	firstColumn: number
): { columns: number; rows: number } {
	let columns = columnsAttr;
	let rows = rowsAttr;
	const occupied = Math.max(childCount, 1) + firstColumn;

	if (rows === 0) {
		if (columns > 0) {
			rows = Math.ceil(occupied / columns);
		} else {
			rows = Math.ceil(Math.sqrt(Math.max(childCount, 1)));
			if (rows * rows < Math.max(childCount, 1)) {
				rows += 1;
			}
			columns = rows;
		}
	} else if (columns === 0) {
		columns = Math.ceil(Math.max(childCount, 1) / rows);
	}

	return {
		columns: Math.max(columns, 1),
		rows: Math.max(rows, 1),
	};
}

export function renderUniformGrid(node: XmlNode, ctx: RenderContext): string {
	const props = processProperties(node, ctx);
	const contentChildren: XmlNode[] = [];

	for (const child of node.children) {
		if (isUniformGridPropertyElement(child)) {
			if (child.localName.endsWith('.children')) {
				contentChildren.push(...child.children);
			}
			continue;
		}
		contentChildren.push(child);
	}

	const visible = contentChildren.filter((child) => !isCollapsed(child));
	const columnsAttr = parseCount(getAttr(node, 'Columns'));
	const rowsAttr = parseCount(getAttr(node, 'Rows'));
	const firstColumn = parseFirstColumn(
		getAttr(node, 'FirstColumn'),
		columnsAttr
	);
	const orientation = (
		getAttr(node, 'Orientation') ?? 'Horizontal'
	).toLowerCase();
	const verticalFlow = orientation === 'vertical';

	const { columns, rows } = computeTracks(
		visible.length,
		columnsAttr,
		rowsAttr,
		verticalFlow ? 0 : firstColumn
	);

	const rowSpacing = getAttr(node, 'RowSpacing');
	const columnSpacing = getAttr(node, 'ColumnSpacing');
	const rowSpacingCss = rowSpacing ? toCssLength(rowSpacing) : undefined;
	const columnSpacingCss = columnSpacing
		? toCssLength(columnSpacing)
		: undefined;

	const gridStyle = [
		'display: grid',
		`grid-template-columns: repeat(${columns}, minmax(0, 1fr))`,
		`grid-template-rows: repeat(${rows}, minmax(0, 1fr))`,
		verticalFlow ? 'grid-auto-flow: column' : 'grid-auto-flow: row',
		'align-items: stretch',
		'justify-items: stretch',
		'width: 100%',
		'box-sizing: border-box',
		'min-width: 0',
		'min-height: 0',
		rowSpacingCss ? `row-gap: ${rowSpacingCss}` : '',
		columnSpacingCss ? `column-gap: ${columnSpacingCss}` : '',
		props.style,
	]
		.filter(Boolean)
		.join('; ');

	const cellStyle = [
		'min-width: 0',
		'min-height: 0',
		'display: grid',
		'grid-template-rows: minmax(0, 1fr)',
		'grid-template-columns: minmax(0, 1fr)',
	].join('; ');

	let itemsHtml = '';
	const skip = verticalFlow ? 0 : firstColumn;
	for (let i = 0; i < skip; i++) {
		itemsHtml += `<div${styleAttr(cellStyle)}></div>`;
	}
	for (const child of visible) {
		itemsHtml += `<div${styleAttr(cellStyle)}>${ctx.renderNode(child)}</div>`;
	}

	return `<div data-xaml="UniformGrid"${styleAttr(gridStyle)}${props.attrs}>${itemsHtml}</div>`;
}
