import { getRepoStars } from "./functions";
import type { ProjectItem } from "./projects.data";
import { projects } from "./projects.data";
import { Badge } from "@/app/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/app/components/ui/card";

export async function ProjectsList() {
	const items: ProjectItem[] = [...projects].sort((a, b) => {
		const aTime = new Date(a.date).getTime();
		const bTime = new Date(b.date).getTime();
		return bTime - aTime;
	});

	const stars = await Promise.all(
		items.map((p) => getRepoStars({ owner: p.repo.owner, repo: p.repo.name })),
	);

	return (
		<div className="space-y-8">
			{items.map((p, idx) => (
				<Card
					key={`${p.repo.owner}/${p.repo.name}`}
					className="hover:-translate-y-1 gap-4 transition-all duration-200 hover:border-b-4 hover:border-b-primary"
				>
					<CardHeader>
						<div className="flex items-start justify-between gap-4">
							<CardTitle className="text-xl sm:text-2xl">{p.title}</CardTitle>
							<Badge variant="secondary" className="px-2.5 text-base">
								⭐ {stars[idx] ?? "—"}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<p className="pb-4 text-muted-foreground text-sm leading-relaxed sm:text-base">
							{p.description}
						</p>
						<div className="flex gap-4">
							<a
								href={p.liveUrl}
								className="inline-flex items-center text-primary hover:underline"
							>
								Visit →
							</a>
							<a
								href={p.githubUrl}
								className="inline-flex items-center text-primary hover:underline"
							>
								GitHub →
							</a>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
