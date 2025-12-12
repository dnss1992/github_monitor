'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from "@/hooks/use-toast";
import { analyzeRepo } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, KeyRound } from 'lucide-react';
import { Header } from '@/components/Header';
import { RepoStats } from '@/components/RepoStats';
import { ForksTable } from '@/components/ForksTable';

const initialState = {
    data: null,
    error: null,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Analyze
        </Button>
    );
}

export default function Home() {
    const [state, formAction] = useFormState(analyzeRepo, initialState);
    const { toast } = useToast();
    const { pending } = useFormStatus();

    useEffect(() => {
        if (state.error) {
            toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: state.error,
            });
        }
    }, [state, toast]);

    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <Header />

                <section className="mt-12 max-w-2xl mx-auto">
                    <form action={formAction}>
                        <div className="bg-card p-2 rounded-lg border shadow-sm space-y-2">
                          <div className="flex flex-col sm:flex-row items-center gap-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background rounded-md">
                              <Input
                                  type="url"
                                  name="url"
                                  placeholder="e.g. https://github.com/facebook/react"
                                  required
                                  className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                              <SubmitButton />
                          </div>
                          <div className="flex items-center gap-2 border-t pt-2">
                                <KeyRound className="h-4 w-4 text-muted-foreground ml-2"/>
                                <Input
                                    type="password"
                                    name="token"
                                    placeholder="Optional: GitHub Access Token"
                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                                />
                            </div>
                        </div>
                    </form>
                </section>
                
                {!state.data && !pending && (
                  <div className="text-center mt-16 text-muted-foreground animate-in fade-in-50">
                    <p>Enter a public GitHub repository URL to analyze its forks.</p>
                  </div>
                )}
                
                {pending && (
                    <div className="flex justify-center items-center mt-16">
                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                
                {state.data && (
                    <section className="mt-12 space-y-8 animate-in fade-in-50 duration-500">
                        <RepoStats data={state.data} />
                        <ForksTable forks={state.data.forks} />
                    </section>
                )}
            </div>
        </main>
    );
}
