
import type { Fork } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Users } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";

export function TopContributorsDashboard({ forks, token }: { forks: Fork[], token: string | null }) {

    const contributorCommits: { [key: string]: { commits: number, avatarUrl: string, repos: Set<string> } } = {};

    const forksWithContributors = forks.filter(f => f.topContributor && f.commitCount);

    forksWithContributors.forEach(fork => {
        if (fork.topContributor) {
            const { name, commits, avatarUrl } = fork.topContributor;
            if (!contributorCommits[name]) {
                contributorCommits[name] = { commits: 0, avatarUrl, repos: new Set() };
            }
            contributorCommits[name].commits += commits;
            contributorCommits[name].repos.add(fork.fullName);
        }
    });

    const sortedContributors = Object.entries(contributorCommits)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.commits - a.commits);

    if (forksWithContributors.length === 0) {
        return (
             <Card className="md:col-span-3">
                <CardHeader>
                    <div className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg font-semibold">Top Contributors Across Forks</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                     <p className="text-sm text-muted-foreground pt-2">No contributor data available to display.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="md:col-span-3">
            <CardHeader>
                <div className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg font-semibold">Top Contributors Across Forks</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                
                    <ul className="space-y-3">
                        {sortedContributors.slice(0, 5).map((committer) => (
                            <li key={committer.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                                        <AvatarImage src={committer.avatarUrl} alt={committer.name} data-ai-hint="person portrait" />
                                        <AvatarFallback>{committer.name.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                         <span className="font-medium">{committer.name}</span>
                                          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                            <span>Contributed to:</span>
                                            {Array.from(committer.repos).slice(0,2).map(repoName => {
                                                 const [owner, repo] = repoName.split('/');
                                                 const params = new URLSearchParams();
                                                 params.set('owner', owner);
                                                 params.set('repo', repo);
                                                 if (token) {
                                                     params.set('token', token);
                                                 }
                                                return (
                                                    <Link key={repoName} href={`/repo/details?${params.toString()}`} className={cn(buttonVariants({variant: "link"}), "h-auto p-0 text-xs")}>
                                                        {repoName}
                                                    </Link>
                                                )
                                            })}
                                            {committer.repos.size > 2 && <span className="text-xs">& more</span>}
                                        </div>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="font-mono">{committer.commits} commits</Badge>
                            </li>
                        ))}
                    </ul>
                
            </CardContent>
        </Card>
    );
}
