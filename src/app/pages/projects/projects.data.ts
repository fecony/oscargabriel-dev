export interface ProjectItem {
	title: string;
	description: string;
	date: string; // ISO date string
	liveUrl: string;
	githubUrl: string;
	repo: { owner: string; name: string };
}

export const projects: ProjectItem[] = [
	{
		title: "Better Cloud",
		description:
			"Fullstack typescript starter kit combining the best of Cloudflare with the modern React ecosystem, including Vite, Hono, Tanstack Router + Query, and Better Auth.",
		date: "2025-04-24",
		liveUrl: "https://better-cloud.dev",
		githubUrl: "https://github.com/oscabriel/better-cloud",
		repo: { owner: "oscabriel", name: "better-cloud" },
	},
	{
		title: "Turbo Cloud",
		description:
			"A monorepo starter kit for building web applications with Turborepo, Vite, Hono, and Cloudflare, based on Better Cloud.",
		date: "2025-05-06",
		liveUrl: "https://turbo-cloud.oscargabriel.workers.dev",
		githubUrl: "https://github.com/oscabriel/turbo-cloud",
		repo: { owner: "oscabriel", name: "turbo-cloud" },
	},
	{
		title: "RedwoodSDK Guestbook",
		description:
			"A guestbook where visitors can leave messages and thoughts. Built with RedwoodSDK, Alchemy, Better Auth, Drizzle, Tanstack Form, and Cloudflare D1 and R2.",
		date: "2025-05-30",
		liveUrl: "https://guestbook.oscargabriel.dev",
		githubUrl: "https://github.com/oscabriel/rwsdk-guestbook",
		repo: { owner: "oscabriel", name: "rwsdk-guestbook" },
	},
	{
		title: "Portfolio Site",
		description:
			"My portfolio site (this very site!) built with RedwoodSDK, Alchemy, Tailwind + shadcn/ui, Cloudflare KV, and Content Collections.",
		date: "2025-07-13",
		liveUrl: "https://oscargabriel.dev",
		githubUrl: "https://github.com/oscabriel/oscargabriel-dev",
		repo: { owner: "oscabriel", name: "oscargabriel-dev" },
	},
];
