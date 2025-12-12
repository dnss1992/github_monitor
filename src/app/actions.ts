"use server";

import { getRepoData } from '@/lib/github';
import type { RepoData } from '@/lib/types';
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

export async function analyzeRepo(prevState: FormState, formData: FormData): Promise<FormState> {
    const url = formData.get('url') as string;

    const validatedUrl = urlSchema.safeParse(url);

    if (!validatedUrl.success) {
        return { data: null, error: validatedUrl.error.errors[0].message };
    }

    try {
        const data = await getRepoData(validatedUrl.data);
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message || "Failed to fetch repository data." };
    }
}
