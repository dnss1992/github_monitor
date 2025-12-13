'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRepoCommits } from '@/lib/github';
import { Ollama } from 'ollama';

type CommitAnalysisProps = {
    owner: string;
    repo: string;
    token: string | null;
    ollamaUrl: string | null;
};

type AnalysisResult = {
    score: number;
    summary: string;
    recommendations: string[];
};

export function CommitAnalysis({ owner, repo, token, ollamaUrl }: CommitAnalysisProps) {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleAnalyze = () => {
        if (!ollamaUrl) {
            toast({
                variant: 'destructive',
                title: 'Ollama URL Required',
                description: 'Please provide an Ollama URL on the main page to use this feature.',
            });
            return;
        }

        startTransition(async () => {
            try {
                const commits = await getRepoCommits(owner, repo, token);
                if (commits.length === 0) {
                    toast({
                        variant: 'destructive',
                        title: 'No Commits Found',
                        description: 'Could not retrieve recent commits for this repository.',
                    });
                    return;
                }

                const ollama = new Ollama({ host: ollamaUrl });
                const commitMessages = commits.map(c => `- ${c.slice(0, 100)}`).join('\n');
                
                const prompt = `
                    Analyze the following recent commit messages from a GitHub repository.
                    Provide a commit message quality score from 0-100.
                    A high score means messages are descriptive, varied, and follow good practices.
                    A low score means messages are generic, repetitive, or uninformative.
                    
                    Also provide a brief summary of the commit quality and 3 actionable recommendations for improvement.
                    
                    Commit Messages:
                    ${commitMessages}
                    
                    Respond ONLY with a valid JSON object in the format:
                    {
                        "score": <number>,
                        "summary": "<string>",
                        "recommendations": ["<string>", "<string>", "<string>"]
                    }
                `;

                const response = await ollama.generate({
                    model: 'llama3', // a popular default, user can configure Ollama as needed
                    prompt: prompt,
                    format: 'json'
                });
                
                const analysisResult = JSON.parse(response.response);
                setResult(analysisResult);

            } catch (error: any) {
                console.error("Analysis failed:", error);
                toast({
                    variant: 'destructive',
                    title: 'Analysis Failed',
                    description: `Could not connect to Ollama at ${ollamaUrl}. Make sure the server is running and accessible. Error: ${error.message}`,
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Commit Message Analysis</CardTitle>
                <CardDescription>
                    Use a local Ollama model to analyze the quality of recent commit messages.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!result && (
                     <Button onClick={handleAnalyze} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Analyze Commits
                    </Button>
                )}

                {isPending && !result && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analyzing... This may take a moment.</span>
                    </div>
                )}
               
                {result && (
                    <div className="space-y-4 animate-in fade-in-50">
                        <div>
                            <p className="text-sm text-muted-foreground">Quality Score</p>
                            <p className="text-4xl font-bold text-primary">{result.score}/100</p>
                        </div>
                        <div>
                            <p className="font-semibold">Summary</p>
                            <p className="text-muted-foreground">{result.summary}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Recommendations</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                {result.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                         <Button onClick={handleAnalyze} disabled={isPending} variant="secondary" size="sm">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            Re-analyze
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
