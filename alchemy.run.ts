import alchemy from "alchemy";
import { KVNamespace, Redwood, WranglerJson } from "alchemy/cloudflare";

const APP_NAME = "oscar-gabriel-dev";

const app = await alchemy(APP_NAME, {
  password: process.env.ALCHEMY_PASSWORD!,
});

const starsCache = await KVNamespace("github-stars-cache", {
  title: "github-stars-cache",
});

export const worker = await Redwood("redwood-app", {
  name: `${APP_NAME}-site`,
  adopt: true,
  compatibilityDate: "2025-06-17",
  bindings: {
    STARS_CACHE: starsCache,
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

await WranglerJson("wrangler", {
  worker,
});

if (app.stage === "prod") {
  console.log({
    url: `https://${process.env.CUSTOM_DOMAIN}`,
  });
}

await app.finalize();
