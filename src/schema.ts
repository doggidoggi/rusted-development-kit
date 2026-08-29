import schemaJson from "../data/schema.json";

export interface FieldDoc {
	key: string;
	valueType: string | null;
	description: string | null;
	example: string | null;
	since: string | null;
	group: string | null;
}

export interface SectionDoc {
	kind: "single" | "multi" | "number" | "unknown";
	fields: FieldDoc[];
}

export interface Schema {
	sections: Record<string, SectionDoc>;
	modInfo: { fields: (FieldDoc & { fileSection: string })[] };
	directives: { name: string; description: string; example: string }[];
	interpolation: { syntax: string; description: string; example: string }[];
}

const schema = schemaJson as unknown as Schema;

const fieldIndexBySection = new Map<string, Map<string, FieldDoc>>();
const patternIndexBySection = new Map<
	string,
	{ regex: RegExp; doc: FieldDoc }[]
>();

function placeholderToRegex(key: string): RegExp {
	const escaped = key.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
	const pattern = escaped
		.replace(/\{NUM\}/g, "\\d+")
		.replace(/\{LANG\}/g, "[a-z]{2}")
		.replace(/#/g, "\\d+")
		.replace(/TYPE/g, "(attack|moving|idle)");
	return new RegExp(`^${pattern}$`);
}

function hasPlaceholder(key: string): boolean {
	return key.includes("{") || key.includes("#") || key.includes("TYPE");
}

function buildIndexes(sectionType: string) {
	const section = schema.sections[sectionType];
	if (!section) return;

	const exact = new Map<string, FieldDoc>();
	const patterns: { regex: RegExp; doc: FieldDoc }[] = [];

	for (const field of section.fields) {
		if (hasPlaceholder(field.key)) {
			patterns.push({ regex: placeholderToRegex(field.key), doc: field });
		} else if (!exact.has(field.key)) {
			exact.set(field.key, field);
		}
	}

	fieldIndexBySection.set(sectionType, exact);
	patternIndexBySection.set(sectionType, patterns);
}

function getIndex(sectionType: string): Map<string, FieldDoc> | undefined {
	if (!fieldIndexBySection.has(sectionType)) {
		if (!schema.sections[sectionType]) return undefined;
		buildIndexes(sectionType);
	}
	return fieldIndexBySection.get(sectionType);
}

export function lookupField(
	sectionType: string,
	key: string,
): FieldDoc | undefined {
	const exact = getIndex(sectionType)?.get(key);
	if (exact) return exact;

	const patterns = patternIndexBySection.get(sectionType);
	return patterns?.find((p) => p.regex.test(key))?.doc;
}

export function fieldsForSection(sectionType: string): FieldDoc[] {
	return schema.sections[sectionType]?.fields ?? [];
}

export function isKnownSectionType(sectionType: string): boolean {
	return sectionType in schema.sections;
}

export function isDeprecated(doc: FieldDoc): boolean {
	return !!doc.group && doc.group.toLowerCase().includes("deprecat");
}

export function lookupDirective(name: string) {
	return schema.directives.find((d) => d.name === name);
}

const NON_VALIDATABLE_SECTION_TYPES = new Set(["template", "comment"]);

export function isNonValidatableSectionType(sectionType: string): boolean {
	return NON_VALIDATABLE_SECTION_TYPES.has(sectionType);
}

export function lookupFieldAnywhere(key: string): FieldDoc | undefined {
	for (const sectionType of Object.keys(schema.sections)) {
		if (NON_VALIDATABLE_SECTION_TYPES.has(sectionType)) continue;
		const found = lookupField(sectionType, key);
		if (found) return found;
	}
	return undefined;
}

export type FieldResolution =
	| { kind: "skip" }
	| { kind: "found"; doc: FieldDoc }
	| { kind: "unknown" };

export function resolveField(
	sectionType: string,
	key: string,
): FieldResolution {
	if (sectionType === "comment") return { kind: "skip" };
	const doc =
		sectionType === "template"
			? lookupFieldAnywhere(key)
			: lookupField(sectionType, key);
	return doc ? { kind: "found", doc } : { kind: "unknown" };
}

type PascalCase<S extends string> = S extends `${infer Head}_${infer Tail}`
	? `${Capitalize<Head>}${PascalCase<Tail>}`
	: Capitalize<S>;

function toPascalCase(s: string): string {
	return s
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

export type SectionType = keyof typeof schema.sections;

export const SectionTypes = Object.fromEntries(
	(Object.keys(schema.sections) as SectionType[]).map((key) => [
		toPascalCase(key),
		key,
	]),
) as { [K in SectionType as PascalCase<K>]: K };

export { schema };
