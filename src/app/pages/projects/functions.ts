"use server";

import { env } from "cloudflare:workers";

export interface RepoRef {
	owner: string;
	repo: string;
}

export async function getRepoStars({
	owner,
	repo,
}: RepoRef): Promise<number | null> {
	const start = Date.now();
	console.log("[getRepoStars] start", { owner, repo });
	const url = `https://api.github.com/repos/${owner}/${repo}`;
	const userAgent = env.GITHUB_USER_AGENT;
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": userAgent,
		"X-GitHub-Api-Version": "2022-11-28",
	};
	const token = env.GITHUB_TOKEN;
	if (token) headers.Authorization = `Bearer ${token}`;

	// KV cache binding from Alchemy: STARS_CACHE
	const cacheKey = `stars:${owner}/${repo}`;
	try {
		const maybeCached = await env.STARS_CACHE.get(cacheKey);
		if (maybeCached) {
			const parsed = Number.parseInt(maybeCached, 10);
			if (Number.isFinite(parsed)) {
				console.log("[getRepoStars] kv cache hit", {
					owner,
					repo,
					stars: parsed,
				});
				return parsed;
			}
		}
		console.log("[getRepoStars] kv cache miss", { owner, repo, cacheKey });
	} catch (e) {
		console.error("[getRepoStars] kv read error", e);
	}

	try {
		const response = await fetch(url, { headers });
		console.log("[getRepoStars] response", {
			owner,
			repo,
			ok: response.ok,
			status: response.status,
			rateRemaining: response.headers.get("x-ratelimit-remaining"),
			rateLimit: response.headers.get("x-ratelimit-limit"),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			console.error("[getRepoStars] non-ok response", {
				owner,
				repo,
				status: response.status,
				body: body.slice(0, 500),
			});
			return null;
		}

		const data = (await response.json()) as { stargazers_count?: number };
		const stars =
			typeof data.stargazers_count === "number" ? data.stargazers_count : null;
		console.log("[getRepoStars] success", { owner, repo, stars });

		// Write to KV for future requests (best-effort)
		if (stars !== null) {
			try {
				await env.STARS_CACHE.put(cacheKey, String(stars), {
					expirationTtl: 3600,
				});
				console.log("[getRepoStars] kv cache write success", {
					owner,
					repo,
					stars,
					ttlSeconds: 3600,
				});
			} catch (e) {
				console.error("[getRepoStars] kv write error", e);
			}
		}
		return stars;
	} catch (error) {
		console.error("[getRepoStars] error", { owner, repo, error });
		return null;
	} finally {
		console.log("[getRepoStars] end", { owner, repo, ms: Date.now() - start });
	}
}
