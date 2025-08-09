import type { site } from "../alchemy.run";

export type WorkerEnv = typeof site.Env;

declare module "cloudflare:workers" {
	namespace Cloudflare {
		export interface Env extends WorkerEnv {}
	}
}
