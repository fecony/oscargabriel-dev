import { allPosts, type Post } from "content-collections";

import { Badge } from "@/app/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/app/components/ui/card";

export function BlogPage() {
	return (
		<div className="bg-background px-4 pb-16">
			<div className="mx-auto max-w-3xl">
				<div className="mb-8">
					<h1 className="mb-6 font-bold text-5xl">Blog</h1>
					<p className="text-base text-muted-foreground sm:text-lg">
						Latest articles and updates
					</p>
				</div>

				<div className="space-y-6">
					{allPosts
						.sort(
							(a: Post, b: Post) =>
								new Date(b.date).getTime() - new Date(a.date).getTime(),
						)
						.map((post: Post) => {
							const slug = post._meta.path.replace(/\.md$/, "");

							return (
								<Card
									key={post._meta.path}
									className="hover:-translate-y-1 transition-all duration-200 hover:border-b-4 hover:border-b-orange-400"
								>
									<CardHeader>
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<CardTitle className="mb-2 text-lg leading-tight sm:text-xl">
													<a
														href={`/blog/${slug}`}
														className="text-foreground transition-colors hover:text-primary"
													>
														{post.title}
													</a>
												</CardTitle>
												<div className="flex items-center gap-3 text-muted-foreground text-xs sm:text-sm">
													<span>By {post.author}</span>
													<span>•</span>
													<time>
														{new Date(post.date).toLocaleDateString("en-US", {
															year: "numeric",
															month: "long",
															day: "numeric",
															timeZone: "UTC",
														})}
													</time>
												</div>
											</div>
											{post.protected && (
												<Badge variant="secondary">🔒 Protected</Badge>
											)}
										</div>
									</CardHeader>
									<CardContent>
										<p className="mb-4 text-muted-foreground text-sm leading-relaxed sm:text-base">
											{post.summary}
										</p>
										<a
											href={`/blog/${slug}`}
											className="font-medium text-orange-400 text-xs transition-colors hover:text-orange-500 hover:underline sm:text-sm"
										>
											Read more →
										</a>
									</CardContent>
								</Card>
							);
						})}
				</div>
			</div>
		</div>
	);
}
