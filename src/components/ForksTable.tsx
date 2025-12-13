
'use client';
import { useState, useTransition } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { GitCommitHorizontal, Search, ChevronRight, Download, Loader2 } from "lucide-react"
import type { Fork } from "@/lib/types"
import { Card } from "./ui/card"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button";
import { getForkDetails } from "@/lib/github";
import { useToast } from "@/hooks/use-toast";


export function ForksTable({ forks, token, ollamaUrl }: { forks: Fork[], token?: string | null, ollamaUrl?: string | null }) {
    const [filter, setFilter] = useState('');
    const [isExporting, startExportTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

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
        const params = new URLSearchParams();
        params.set('owner', owner);
        params.set('repo', repo);
        if (token) {
            params.set('token', token);
        }
        if (ollamaUrl) {
            params.set('ollamaUrl', ollamaUrl);
        }
        router.push(`/repo/details?${params.toString()}`);
    }

    const handleExport = () => {
        startExportTransition(async () => {
             try {
                const detailedForks: Fork[] = await Promise.all(
                    filteredForks.map(async (fork) => {
                        const [owner, repo] = fork.fullName.split('/');
                        const details = await getForkDetails(owner, repo, token);
                        return { ...fork, ...details };
                    })
                );

                const header = "Repository,Total Commits,Top Contributor,Lines of Code Added\n";
                const csvRows = detailedForks.map(fork => {
                    const repoName = fork.fullName;
                    const commits = fork.commitCount || 0;
                    const contributor = fork.topContributor?.name || "N/A";
                    const linesAdded = fork.linesAdded || 0;
                    return `"${repoName}",${commits},"${contributor}",${linesAdded}`;
                }).join('\n');

                const csvString = header + csvRows;
                
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', 'forks_export.csv');
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
             } catch (error: any) {
                 toast({
                    variant: "destructive",
                    title: "Export Failed",
                    description: error.message || "Could not fetch details for CSV export.",
                });
             }
        });
    }

    return (
        <Card>
            <div className="p-4 border-b flex items-center gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="search"
                        placeholder="Filter by name..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export as CSV
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80%]">Forked Repository</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredForks.map((fork) => (
                        <TableRow key={fork.id} onClick={() => handleRowClick(fork)} className="cursor-pointer">
                            <TableCell className="font-medium">{fork.fullName}</TableCell>
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
