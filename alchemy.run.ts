import alchemy from "alchemy";
import { Redwood, WranglerJson } from "alchemy/cloudflare";

const APP_NAME = "oscar-gabriel-dev";

const app = await alchemy(APP_NAME, {
  password: process.env.ALCHEMY_PASSWORD!,
});

export const worker = await Redwood("redwood-app", {
  name: `${APP_NAME}-site`,
  adopt: true,
  compatibilityDate: "2025-08-08",
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

console.log({
  url: process.env.CUSTOM_DOMAIN || "http://localhost:5173",
});

await app.finalize();
