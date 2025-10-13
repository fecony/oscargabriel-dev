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

			// Create a wrapper div to position the button relative to
			const wrapper = document.createElement("div");
			wrapper.style.position = "relative";

			// Insert wrapper before the pre element and move pre inside it
			block.parentNode?.insertBefore(wrapper, block);
			wrapper.appendChild(block);

			// Create a container for the copy button
			const buttonContainer = document.createElement("div");
			wrapper.appendChild(buttonContainer);

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
