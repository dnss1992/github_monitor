import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitCommitHorizontal, Search, ChevronRight } from "lucide-react"
import type { Fork } from "@/lib/types"
import Link from "next/link"
import { Card } from "./ui/card"
import { useRouter } from "next/navigation"

export function ForksTable({ forks, token }: { forks: Fork[], token?: string | null }) {
    const [filter, setFilter] = useState('');
    const router = useRouter();

    if (forks.length === 0) {
        return (
            <Card className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No forks found for this repository.</p>
            </Card>
        )
    }

    const filteredForks = forks.filter(fork => fork.fullName.toLowerCase().includes(filter.toLowerCase()));
    
    const handleRowClick = (fork: Fork) => {
        const [owner, repo] = fork.fullName.split('/');
        const queryString = token ? `?token=${encodeURIComponent(token)}` : '';
        router.push(`/repo/${owner}/${repo}${queryString}`);
    }

    return (
        <Card>
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="search"
                        placeholder="Filter by name..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60%]">Forked Repository</TableHead>
                        <TableHead className="text-center">Commits Ahead</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredForks.map((fork) => (
                        <TableRow key={fork.id} onClick={() => handleRowClick(fork)} className="cursor-pointer">
                            <TableCell className="font-medium">{fork.fullName}</TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />
                                    <span>{fork.commitCount}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <ChevronRight className="h-4 w-4 inline-block" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             {filteredForks.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                    No forks match your filter.
                </div>
            )}
        </Card>
    )
}
