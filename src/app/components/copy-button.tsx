"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyButtonProps {
	text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="absolute top-3 right-3 rounded-md bg-muted p-2 transition-colors hover:bg-accent"
			aria-label="Copy code to clipboard"
		>
			{copied ? (
				<Check className="h-4 w-4 text-primary" />
			) : (
				<Copy className="h-4 w-4 text-muted-foreground" />
			)}
		</button>
	);
}
