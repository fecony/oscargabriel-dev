import alchemy from "alchemy";
import { KVNamespace, Redwood, WranglerJson } from "alchemy/cloudflare";

const app = await alchemy("oscar-gabriel-dev");

const repoCache = await KVNamespace("github-repo-cache", {
	title: "github-repo-cache",
});

export const worker = await Redwood("redwood-app", {
	name: `${app.name}-site`,
	entrypoint: "./dist/worker/index.js",
	adopt: true,
	compatibility: "node",
	compatibilityDate: "2025-08-21",
	bindings: {
		REPO_CACHE: repoCache,
		GITHUB_TOKEN: alchemy.secret.env.GITHUB_TOKEN,
		GITHUB_USER_AGENT: alchemy.secret.env.GITHUB_USER_AGENT,
	},
	domains: [
		{
			domainName: alchemy.env.CUSTOM_DOMAIN,
			zoneId: alchemy.env.CLOUDFLARE_ZONE_ID,
			adopt: true,
		},
	],
});

if (app.stage === "prod") {
	await WranglerJson({
		worker,
		path: "wrangler.jsonc",
	});

	console.log({
		url: `https://${alchemy.env.CUSTOM_DOMAIN}`,
	});
}

await app.finalize();
