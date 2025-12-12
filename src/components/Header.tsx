import { GitFork } from 'lucide-react';

export function Header() {
    return (
        <header>
            <div className="flex items-center gap-4">
                <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-md">
                    <GitFork className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">Git Insights</h1>
                    <p className="text-muted-foreground mt-1">
                        Analyze fork and commit activity for any public GitHub repository.
                    </p>
                </div>
            </div>
        </header>
    );
}
