'use client';

import { useState, useTransition } from 'react';
import { useToast } from "@/hooks/use-toast";
import { analyzeRepo } from '@/app/actions';
import type { RepoData } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, KeyRound } from 'lucide-react';
import { Header } from '@/components/Header';
import { RepoStats } from '@/components/RepoStats';
import { ForksTable } from '@/components/ForksTable';

type FormState = {
    data: RepoData | null,
    error: string | null
}

const initialState: FormState = {
    data: null,
    error: null,
};

function SubmitButton({ isPending }: { isPending: boolean }) {
    return (
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Analyze
        </Button>
    );
}

export default function Home() {
    const [state, setState] = useState<FormState>(initialState);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [url, setUrl] = useState('');
    const [token, setToken] = useState('');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        startTransition(async () => {
            const result = await analyzeRepo(formData);
            setState(result);
            if (result.error) {
                 toast({
                    variant: "destructive",
                    title: "Analysis Failed",
                    description: result.error,
                });
            }
        });
    };

    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <Header />

                <section className="mt-12 max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-card p-2 rounded-lg border shadow-sm space-y-2">
                          <div className="flex flex-col sm:flex-row items-center gap-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background rounded-md">
                              <Input
                                  type="url"
                                  name="url"
                                  value={url}
                                  onChange={(e) => setUrl(e.target.value)}
                                  placeholder="e.g. https://github.com/facebook/react"
                                  required
                                  className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                              <SubmitButton isPending={isPending} />
                          </div>
                          <div className="flex items-center gap-2 border-t pt-2">
                                <KeyRound className="h-4 w-4 text-muted-foreground ml-2"/>
                                <Input
                                    type="password"
                                    name="token"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Optional: GitHub Access Token"
                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                                />
                            </div>
                        </div>
                    </form>
                </section>
                
                {!state.data && !isPending && (
                  <div className="text-center mt-16 text-muted-foreground animate-in fade-in-50">
                    <p>Enter a public GitHub repository URL to analyze its forks.</p>
                  </div>
                )}
                
                {isPending && (
                    <div className="flex justify-center items-center mt-16">
                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                
                {state.data && (
                    <section className="mt-12 space-y-8 animate-in fade-in-50 duration-500">
                        <RepoStats data={state.data} />
                        <ForksTable forks={state.data.forks} token={token} />
                    </section>
                )}
            </div>
        </main>
    );
}
