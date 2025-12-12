
'use client';
import { useEffect, useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchRepoDetails } from '@/app/actions';
import type { RepoDetails } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { RepoDetailStats } from '@/components/RepoDetailStats';
import { ContributorsTable } from '@/components/ContributorsTable';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

function RepoDashboardContent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [details, setDetails] = useState<RepoDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const token = searchParams.get('token');

    useEffect(() => {
        if (owner && repo) {
            startTransition(async () => {
                const result = await fetchRepoDetails(owner, repo, token);
                if ('error' in result) {
                    setError(result.error);
                    toast({
                        variant: 'destructive',
                        title: 'Failed to load details',
                        description: result.error,
                    });
                } else {
                    setDetails(result);
                }
            });
        }
    }, [owner, repo, token, toast]);

    if (!owner || !repo) {
         return (
            <main className="min-h-screen bg-background text-foreground">
                <div className="container mx-auto px-4 py-8 md:py-12">
                     <Card className="flex items-center justify-center p-8">
                        <p className="text-destructive">Repository owner and name not provided.</p>
                    </Card>
                </div>
            </main>
        )
    }

    const repoUrl = `https://github.com/${owner}/${repo}`;
    const backLink = token ? `/?token=${encodeURIComponent(token)}` : '/';


    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <header className="mb-8">
                    <div className="flex items-center justify-between">
                         <Button asChild variant="outline">
                            <Link href={backLink}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to search
                            </Link>
                        </Button>
                        <Button asChild variant="secondary">
                             <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                                View on GitHub
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                    <div className='mt-6'>
                        <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground break-words">
                            {owner}/{repo}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Activity Dashboard
                        </p>
                    </div>
                </header>

                {isPending && (
                    <div className="flex justify-center items-center mt-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {error && !isPending && (
                     <Card className="flex items-center justify-center p-8">
                        <p className="text-destructive">{error}</p>
                    </Card>
                )}

                {details && !isPending && (
                    <div className="space-y-8 animate-in fade-in-50 duration-500">
                        <RepoDetailStats data={details} />
                        <ContributorsTable contributors={details.contributors} />
                    </div>
                )}
            </div>
        </main>
    );
}


export default function RepoDashboard() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <RepoDashboardContent />
        </Suspense>
    )
}
