import { getRepoLastCommitDate, getRepoStars } from "./functions";
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
	const [stars, lastCommitDates] = await Promise.all([
		Promise.all(
			projects.map((p) =>
				getRepoStars({ owner: p.repo.owner, repo: p.repo.name }),
			),
		),
		Promise.all(
			projects.map((p) =>
				getRepoLastCommitDate({ owner: p.repo.owner, repo: p.repo.name }),
			),
		),
	]);

	const items: ProjectItem[] = [...projects]
		.map((project, idx) => ({
			...project,
			lastCommitDate: lastCommitDates[idx],
			stars: stars[idx],
		}))
		.sort((a, b) => {
			const aTime = new Date(a.lastCommitDate || a.date).getTime();
			const bTime = new Date(b.lastCommitDate || b.date).getTime();
			return bTime - aTime;
		});

	return (
		<div className="space-y-8">
			{items.map((p) => (
				<Card
					key={`${p.repo.owner}/${p.repo.name}`}
					className="hover:-translate-y-1 gap-4 transition-all duration-200 hover:border-b-4 hover:border-b-primary"
				>
					<CardHeader>
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-1">
								<CardTitle className="text-xl sm:text-2xl">{p.title}</CardTitle>
								<p className="text-muted-foreground text-sm italic">
									Last updated:{" "}
									{(p as any).lastCommitDate
										? new Date((p as any).lastCommitDate).toLocaleDateString(
												"en-US",
												{
													year: "numeric",
													month: "long",
													day: "numeric",
												},
											)
										: new Date(p.date).toLocaleDateString("en-US", {
												year: "numeric",
												month: "long",
												day: "numeric",
											})}
								</p>
							</div>
							<Badge variant="secondary" className="px-2.5 text-base">
								⭐ {(p as any).stars ?? "—"}
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
								className="font-medium text-primary transition-colors hover:text-primary/80"
							>
								Visit →
							</a>
							<a
								href={p.githubUrl}
								className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground hover:underline"
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
