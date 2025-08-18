import { ProjectsList } from "./projects-list";

export async function ProjectsPage() {
	return (
		<div className="bg-background px-4 pb-16">
			<div className="mx-auto max-w-3xl">
				<div className="mb-8">
					<h1 className="mb-6 font-bold text-5xl">Projects</h1>
				</div>
				<ProjectsList />
			</div>
		</div>
	);
}
