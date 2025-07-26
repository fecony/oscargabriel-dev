"use client";

import { useLayoutEffect } from "react";

export function ScrollToTop() {
	useLayoutEffect(() => {
		let popStateWasCalled = false;

		const observer = new MutationObserver(() => {
			if (!popStateWasCalled) {
				window.scrollTo(0, 0);
			}
			popStateWasCalled = false;
		});

		function handlePopState() {
			popStateWasCalled = true;
		}

		const main = document.querySelector("main");

		if (main) {
			window.addEventListener("popstate", handlePopState);
			observer.observe(main, { childList: true, subtree: true });
		}

		return () => {
			window.removeEventListener("popstate", handlePopState);
			observer.disconnect();
		};
	}, []);

	return null;
}
