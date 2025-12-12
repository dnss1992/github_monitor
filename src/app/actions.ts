'use server';

import { getRepoData, getRepoDetails } from '@/lib/github';
import type { RepoData, RepoDetails } from '@/lib/types';
import { z } from 'zod';

const urlSchema = z.string().url({ message: "Please enter a valid URL." }).refine(
    (url) => {
        try {
            const hostname = new URL(url).hostname;
            return hostname === 'github.com';
        } catch {
            return false;
        }
    },
    {
        message: "Please enter a GitHub repository URL.",
    }
);

type FormState = {
    data: RepoData | null,
    error: string | null
}

export async function analyzeRepo(formData: FormData): Promise<FormState> {
    const url = formData.get('url') as string;
    const token = formData.get('token') as string | null;

    const validatedUrl = urlSchema.safeParse(url);

    if (!validatedUrl.success) {
        return { data: null, error: validatedUrl.error.errors[0].message };
    }

    try {
        const data = await getRepoData(validatedUrl.data, token);
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message || "Failed to fetch repository data." };
    }
}

export async function fetchRepoDetails(owner: string, repo: string, token: string | null): Promise<RepoDetails | { error: string }> {
    try {
        const data = await getRepoDetails(owner, repo, token);
        return data;
    } catch (error: any) {
        return { error: error.message || "Failed to fetch repository details." };
    }
}
