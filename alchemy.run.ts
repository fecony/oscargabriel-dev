import alchemy from "alchemy";
import { KVNamespace, Redwood, WranglerJson } from "alchemy/cloudflare";

const APP_NAME = "oscar-gabriel-dev";

const app = await alchemy(APP_NAME, {
  password: process.env.ALCHEMY_PASSWORD!,
});

const repoCache = await KVNamespace("github-repo-cache", {
  title: "github-repo-cache",
});

export const worker = await Redwood("redwood-app", {
  name: `${APP_NAME}-site`,
  adopt: true,
  compatibilityDate: "2025-06-17",
  bindings: {
    REPO_CACHE: repoCache,
    GITHUB_TOKEN: alchemy.secret(process.env.GITHUB_TOKEN!),
    GITHUB_USER_AGENT: process.env.GITHUB_USER_AGENT!,
  },
  domains: [
    {
      domainName: process.env.CUSTOM_DOMAIN!,
      zoneId: process.env.CLOUDFLARE_ZONE_ID!,
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
    url: `https://${process.env.CUSTOM_DOMAIN}`,
  });
}

await app.finalize();
