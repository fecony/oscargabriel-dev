import { ProjectsList } from "./projects-list";

export async function ProjectsPage() {
	return (
		<div className="bg-background px-4">
			<div className="mx-auto max-w-3xl">
				<h1 className="mb-6 font-bold text-5xl">Projects</h1>
				<ProjectsList />
			</div>
		</div>
	);
}
