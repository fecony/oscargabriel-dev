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
				return parsed;
			}
		}
	} catch (e) {
		console.error("[getRepoStars] kv read error", e);
	}

	try {
		const response = await fetch(url, { headers });

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

		// Write to KV for future requests (best-effort)
		if (stars !== null) {
			try {
				await env.STARS_CACHE.put(cacheKey, String(stars), {
					expirationTtl: 3600,
				});
			} catch (e) {
				console.error("[getRepoStars] kv write error", e);
			}
		}
		return stars;
	} catch (error) {
		console.error("[getRepoStars] error", { owner, repo, error });
		return null;
	}
}
