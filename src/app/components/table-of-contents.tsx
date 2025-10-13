"use client";

import { useEffect, useState } from "react";

export interface Heading {
	id: string;
	text: string;
	level: number;
}

interface TableOfContentsProps {
	headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
	const [activeId, setActiveId] = useState<string>("");

	useEffect(() => {
		// Get all heading elements
		const headingElements = headings.map((heading) =>
			document.getElementById(heading.id),
		);

		// Create intersection observer to track which heading is in view
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				}
			},
			{
				rootMargin: "0% 0% -80% 0%",
				threshold: 1,
			},
		);

		// Observe all heading elements
		for (const element of headingElements) {
			if (element) {
				observer.observe(element);
			}
		}

		return () => {
			for (const element of headingElements) {
				if (element) {
					observer.unobserve(element);
				}
			}
		};
	}, [headings]);

	if (headings.length === 0) {
		return null;
	}

	return (
		<nav className="max-h-[calc(100vh-8rem)] overflow-y-auto">
			<h3 className="mb-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
				Table of Contents
			</h3>
			<ul className="space-y-2 text-xs">
				{headings.map((heading) => {
					const isActive = activeId === heading.id;
					const paddingLeft = (heading.level - 2) * 0.75; // Indent based on level

					return (
						<li key={heading.id} style={{ paddingLeft: `${paddingLeft}rem` }}>
							<a
								href={`#${heading.id}`}
								className={`block py-1 transition-colors hover:text-primary ${
									isActive
										? "font-medium text-primary"
										: "text-muted-foreground"
								}`}
								onClick={(e) => {
									e.preventDefault();
									const element = document.getElementById(heading.id);
									if (element) {
										const top =
											element.getBoundingClientRect().top + window.scrollY - 80;
										window.scrollTo({ top, behavior: "smooth" });
									}
								}}
							>
								{heading.text}
							</a>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
