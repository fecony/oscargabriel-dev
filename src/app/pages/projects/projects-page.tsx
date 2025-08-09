export function ProjectsPage() {
	return (
		<div className="bg-background px-4">
			<div className="mx-auto max-w-3xl">
				<h1 className="mb-6 font-bold text-5xl">Projects</h1>
				<div className="space-y-8">
					<div className="rounded-lg border p-6">
						<h2 className="mb-2 font-semibold text-2xl">Guestbook</h2>
						<p className="mb-4 text-muted-foreground">
							A simple guestbook where visitors can leave messages and thoughts.
							Built with RedwoodSDK, Alchemy, Better Auth, Drizzle, Tanstack
							Form, and Cloudflare D1 and R2.
						</p>
						<a
							href="https://guestbook.oscargabriel.dev"
							className="inline-flex items-center text-primary hover:underline"
						>
							Visit Guestbook →
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
