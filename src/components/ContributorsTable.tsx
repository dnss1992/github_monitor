import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { ContributorStat } from "@/lib/types"
import { Card } from "./ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export function ContributorsTable({ contributors }: { contributors: ContributorStat[] }) {

    const sortedContributors = [...contributors].sort((a,b) => b.total - a.total);

    return (
        <Card>
             <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Contributors</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Contributor</TableHead>
                        <TableHead className="text-right">Total Commits</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedContributors.map((contributor) => (
                        <TableRow key={contributor.author.login}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={contributor.author.avatar_url} alt={contributor.author.login} />
                                        <AvatarFallback>{contributor.author.login.slice(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{contributor.author.login}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{contributor.total}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {sortedContributors.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                    No contributor data available. This can happen for very large repositories.
                </div>
            )}
        </Card>
    )
}
