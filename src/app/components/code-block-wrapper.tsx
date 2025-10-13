"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CopyButton } from "./copy-button";

interface CodeBlockWrapperProps {
	children: React.ReactNode;
}

export function CodeBlockWrapper({ children }: CodeBlockWrapperProps) {
	useEffect(() => {
		// Find all code blocks
		const codeBlocks = document.querySelectorAll(".prose pre");

		const roots: ReturnType<typeof createRoot>[] = [];

		for (const block of codeBlocks) {
			const codeElement = block.querySelector("code");
			if (!codeElement) continue;

			// Get the text content for copying
			const text = codeElement.textContent || "";

			// Make the pre element relative for absolute positioning
			(block as HTMLElement).style.position = "relative";

			// Create a container for the copy button
			const buttonContainer = document.createElement("div");
			block.appendChild(buttonContainer);

			// Render the copy button
			const root = createRoot(buttonContainer);
			root.render(<CopyButton text={text} />);
			roots.push(root);
		}

		// Cleanup
		return () => {
			for (const root of roots) {
				root.unmount();
			}
		};
	}, []);

	return <>{children}</>;
}
