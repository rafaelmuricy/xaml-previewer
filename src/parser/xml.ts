import { XMLParser } from 'fast-xml-parser';
import type { XmlNode } from './types';

type FxpNode = Record<string, unknown>;

function stripPrefix(name: string): string {
	const colon = name.indexOf(':');
	return colon >= 0 ? name.slice(colon + 1) : name;
}

export function localPropName(name: string): string {
	const trimmed = name.startsWith('@_') ? name.slice(2) : name;
	const colon = trimmed.indexOf(':');
	if (colon >= 0 && !trimmed.includes('.')) {
		return trimmed.slice(colon + 1);
	}
	if (colon >= 0) {
		return trimmed.slice(colon + 1);
	}
	return trimmed;
}

function hasPreserveSpace(attributes: Record<string, string>): boolean {
	for (const [key, value] of Object.entries(attributes)) {
		const lower = key.toLowerCase();
		if (
			(lower === 'xml:space' || lower === 'space') &&
			value.toLowerCase() === 'preserve'
		) {
			return true;
		}
	}
	return false;
}

export function getAttr(node: XmlNode, name: string): string | undefined {
	const target = name.toLowerCase();
	for (const [key, value] of Object.entries(node.attributes)) {
		const local = localPropName(key).toLowerCase();
		if (local === target) {
			return value;
		}
	}
	return undefined;
}

/** Avalonia `Classes` / WPF `Class`, plus `Classes.foo="True"`. */
export function getElementClasses(node: XmlNode): string[] {
	const classes: string[] = [];
	const raw = getAttr(node, 'Classes') ?? getAttr(node, 'Class') ?? '';
	classes.push(...raw.split(/[\s,]+/).filter(Boolean));

	for (const [key, value] of Object.entries(node.attributes)) {
		const local = localPropName(key);
		const match = /^Classes\.(.+)$/i.exec(local);
		if (match && !/^(false|0)$/i.test(value.trim())) {
			classes.push(match[1]);
		}
	}
	return classes;
}

function convertOrdered(nodes: unknown[]): XmlNode[] {
	const result: XmlNode[] = [];

	for (const item of nodes) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		const entry = item as FxpNode;

		if (typeof entry['#text'] === 'string') {
			continue;
		}

		const attrBag = entry[':@'] as Record<string, string> | undefined;
		const attributes: Record<string, string> = {};
		if (attrBag) {
			for (const [key, value] of Object.entries(attrBag)) {
				const name = key.startsWith('@_') ? key.slice(2) : key;
				attributes[name] = String(value).trim();
			}
		}

		for (const [key, value] of Object.entries(entry)) {
			if (
				key === ':@' ||
				key === '#text' ||
				key === '?xml' ||
				key === '#comment' ||
				key.startsWith('?')
			) {
				continue;
			}

			const tagName = stripPrefix(key);
			const localName = tagName.toLowerCase();
			const childrenRaw = Array.isArray(value) ? value : [];

			let text = '';
			const childNodes: XmlNode[] = [];
			for (const child of childrenRaw) {
				if (!child || typeof child !== 'object') {
					continue;
				}
				const childObj = child as FxpNode;
				if (typeof childObj['#text'] === 'string') {
					text += childObj['#text'];
					continue;
				}
				childNodes.push(...convertOrdered([child]));
			}

			const xmlNode: XmlNode = {
				tagName,
				localName,
				attributes,
				children: childNodes,
				text: hasPreserveSpace(attributes) ? text : text.trim(),
				line: 1,
			};
			for (const child of childNodes) {
				child.parent = xmlNode;
			}
			result.push(xmlNode);
		}
	}

	return result;
}

export function parseXamlToNodes(source: string): XmlNode[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
		preserveOrder: true,
		trimValues: false,
		allowBooleanAttributes: true,
		commentPropName: '#comment',
	});

	const parsed = parser.parse(source) as unknown[];
	if (!Array.isArray(parsed) || parsed.length === 0) {
		return [];
	}

	return convertOrdered(parsed).filter((n) => n.localName !== '#comment');
}
