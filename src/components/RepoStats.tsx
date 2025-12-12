import { GitFork, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { RepoData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function RepoStats({ data }: { data: RepoData }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Forks</CardTitle>
          <GitFork className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.forksCount.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Frequent Committers (Recent)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
            {data.recentCommitters.length > 0 ? (
                <ul className="space-y-3">
                    {data.recentCommitters.slice(0, 3).map((committer) => (
                        <li key={committer.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border-2 border-primary/20">
                                    <AvatarImage src={`https://picsum.photos/seed/${committer.name.replace(/\s/g, '')}/40/40`} alt={committer.name} data-ai-hint="person portrait" />
                                    <AvatarFallback>{committer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{committer.name}</span>
                            </div>
                            <Badge variant="secondary" className="font-mono">{committer.commits} commits</Badge>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground pt-2">No recent commit activity found.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
