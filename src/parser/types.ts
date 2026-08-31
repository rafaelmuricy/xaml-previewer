import type * as vscode from 'vscode';
import type { ResourceRegistry } from './resourceRegistry';

export interface XmlNode {
	/** Local tag name with original casing (no namespace prefix). */
	tagName: string;
	/** Lowercase local tag name for lookups. */
	localName: string;
	attributes: Record<string, string>;
	children: XmlNode[];
	text: string;
	line: number;
	/** Visual/logical parent in the parsed tree (unset on document roots). */
	parent?: XmlNode;
}

export interface RenderContext {
	output: vscode.OutputChannel;
	renderChildren: (nodes: XmlNode[]) => string;
	renderNode: (node: XmlNode) => string;
	hasUnknown: { value: boolean };
	showUnknownTags: boolean;
	styleRegistry?: ResourceRegistry;
	resolveImageSrc?: (source: string) => string | undefined;
	/** VS Code / MAUI color scheme for AppThemeBinding. */
	colorScheme?: 'light' | 'dark';
}

export type TagHandler = (node: XmlNode, ctx: RenderContext) => string;

export interface ParseResult {
	html: string;
	hasUnknown: boolean;
	error?: string;
}
