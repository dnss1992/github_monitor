
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type RepoAnalysisPromptProps = {
    repoUrl: string;
};

export function RepoAnalysisPrompt({ repoUrl }: RepoAnalysisPromptProps) {
    const [isCopied, setIsCopied] = useState(false);

    const prompt = `
You are an expert code repository evaluator. Analyze the following GitHub repository based on its URL and the content of its README file.

Repository URL: ${repoUrl}

Provide a comprehensive evaluation based on the following criteria. Present your response in a structured markdown format.

1.  **README Quality Score (0-10):**
    *   **Clarity and Completeness:** Does it have a clear title, concise description, installation instructions, usage examples, and license information?
    *   **Formatting:** Is the README well-organized and easy to read?
    *   **Score:** Assign a score out of 10.

2.  **Project Purpose and Viability:**
    *   **Stated Goal:** What problem does the project solve? Is the goal clearly articulated?
    *   **Originality:** Does this appear to be an original project, a fork with significant changes, or a simple tutorial/example repository?
    *   **Viability:** Based on the README, does the project seem functional or is it a work-in-progress?

3.  **Code Quality & Best Practices (Inference from README):**
    *   **Dependencies:** Are dependencies listed? Are they modern and well-regarded?
    *   **Configuration:** Does the README mention environment variables or configuration files?
    *   **Testing:** Is there any mention of how to run tests?
    *   **Contribution Guidelines:** Are there clear instructions for potential contributors?

4.  **Overall Summary and Recommendations:**
    *   Provide a 2-3 sentence summary of the repository's quality and purpose.
    *   List 3 actionable recommendations for the repository owner to improve the project's presentation and clarity. For example: "Add a 'License' section to the README," or "Include a screenshot or GIF of the project in action."
    `.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Repo Analysis Prompt</CardTitle>
                <CardDescription>
                    Copy this prompt and paste it into a large language model (like GPT-4 or Gemini) for a qualitative analysis of this repository.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>View Prompt</AccordionTrigger>
                        <AccordionContent>
                            <div className="relative bg-muted p-4 rounded-md">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-2 right-2 h-7 w-7"
                                    onClick={handleCopy}
                                >
                                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <pre className="text-xs whitespace-pre-wrap font-mono">
                                    <code>{prompt}</code>
                                </pre>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
