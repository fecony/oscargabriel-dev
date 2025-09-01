import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMarkdown } from "@content-collections/markdown";
import { z } from "zod";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

const posts = defineCollection({
	name: "posts",
	directory: "./src/app/pages/blog/content/",
	include: "*.md",
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		date: z.coerce.date(),
		author: z.string(),
		protected: z.boolean().optional(),
		headerImage: z.string().optional(),
		headerImageCaption: z.string().optional(),
	}),
	transform: async (document, context) => {
		try {
			const html = await compileMarkdown(context, document, {
				rehypePlugins: [rehypeRaw, rehypeHighlight],
			});
			return {
				...document,
				html,
			};
		} catch (error) {
			console.error(
				`Failed to compile markdown for ${document._meta?.path}:`,
				error,
			);
			// Return document with basic HTML fallback
			return {
				...document,
				html: `<p>${document.content}</p>`,
			};
		}
	},
});

export default defineConfig({
	collections: [posts],
});
