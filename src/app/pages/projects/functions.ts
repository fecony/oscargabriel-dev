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

	// KV cache binding from Alchemy: REPO_CACHE
	const cacheKey = `stars:${owner}/${repo}`;
	try {
		const maybeCached = await env.REPO_CACHE.get(cacheKey);
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
				await env.REPO_CACHE.put(cacheKey, String(stars), {
					expirationTtl: 300,
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

export async function getRepoLastCommitDate({
	owner,
	repo,
}: RepoRef): Promise<string | null> {
	const url = `https://api.github.com/repos/${owner}/${repo}/commits`;
	const userAgent = env.GITHUB_USER_AGENT;
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": userAgent,
		"X-GitHub-Api-Version": "2022-11-28",
	};
	const token = env.GITHUB_TOKEN;
	if (token) headers.Authorization = `Bearer ${token}`;

	// KV cache binding from Alchemy: REPO_CACHE
	const cacheKey = `last-commit:${owner}/${repo}`;
	try {
		const maybeCached = await env.REPO_CACHE.get(cacheKey);
		if (maybeCached) {
			return maybeCached;
		}
	} catch (e) {
		console.error("[getRepoLastCommitDate] kv read error", e);
	}

	try {
		const requestUrl = `${url}?per_page=1`;
		const response = await fetch(requestUrl, { headers });

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			console.error("[getRepoLastCommitDate] non-ok response", {
				owner,
				repo,
				status: response.status,
				body: body.slice(0, 500),
			});
			return null;
		}

		const data = (await response.json()) as Array<{
			commit?: { committer?: { date?: string } };
		}>;

		const lastCommitDate = data[0]?.commit?.committer?.date;

		if (!lastCommitDate) {
			return null;
		}

		// Write to KV for future requests (best-effort)
		try {
			await env.REPO_CACHE.put(cacheKey, lastCommitDate, {
				expirationTtl: 300,
			});
		} catch (e) {
			console.error("[getRepoLastCommitDate] kv write error", e);
		}

		return lastCommitDate;
	} catch (error) {
		console.error("[getRepoLastCommitDate] error", { owner, repo, error });
		return null;
	}
}
