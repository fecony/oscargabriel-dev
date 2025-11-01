import type { Heading } from "@/app/components/table-of-contents";

/**
 * Decodes HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#x26;/g, "&")
		.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec))
		.replace(/&#x([0-9a-f]+);/gi, (_match, hex) =>
			String.fromCharCode(Number.parseInt(hex, 16)),
		);
}

/**
 * Extracts headings (h2, h3, h4) from HTML string for table of contents
 */
export function extractHeadingsFromHtml(html: string): Heading[] {
	const headings: Heading[] = [];

	// Match h2, h3, and h4 tags with id attributes
	const headingRegex = /<h([234])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h\1>/gi;

	let match: RegExpExecArray | null = headingRegex.exec(html);
	while (match !== null) {
		const level = Number.parseInt(match[1], 10);
		const id = match[2];
		// Remove HTML tags from the heading text and decode entities
		const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, "").trim());

		headings.push({
			id,
			text,
			level,
		});

		match = headingRegex.exec(html);
	}

	return headings;
}
