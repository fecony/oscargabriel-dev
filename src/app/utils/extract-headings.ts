import type { Heading } from "@/app/components/table-of-contents";

/**
 * Extracts headings (h2, h3, h4) from HTML string for table of contents
 */
export function extractHeadingsFromHtml(html: string): Heading[] {
	const headings: Heading[] = [];

	// Match h2, h3, and h4 tags with id attributes
	const headingRegex = /<h([234])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h\1>/gi;

	let match: RegExpExecArray | null;
	while ((match = headingRegex.exec(html)) !== null) {
		const level = Number.parseInt(match[1], 10);
		const id = match[2];
		// Remove HTML tags from the heading text
		const text = match[3].replace(/<[^>]+>/g, "").trim();

		headings.push({
			id,
			text,
			level,
		});
	}

	return headings;
}
