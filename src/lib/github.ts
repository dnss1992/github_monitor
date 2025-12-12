import type { RepoData, Fork, Committer } from '@/lib/types';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

const githubFetch = async (endpoint: string, token?: string | null) => {
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
    };
    
    const apiToken = token || GITHUB_ACCESS_TOKEN;
    if (apiToken) {
        headers['Authorization'] = `token ${apiToken}`;
    }

    const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
        headers,
        next: {
            revalidate: 3600 // Revalidate every hour
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('GitHub API Error:', {
            status: response.status,
            statusText: response.statusText,
            endpoint,
            errorData,
        });

        if (response.status === 401) {
            throw new Error('GitHub API authentication failed. Please check your access token.');
        }
        if (response.status === 403) {
            const rateLimitReset = response.headers.get('x-ratelimit-reset');
            const resetTime = rateLimitReset ? new Date(Number(rateLimitReset) * 1000).toLocaleTimeString() : 'unknown';
            throw new Error(`GitHub API rate limit exceeded. Please try again after ${resetTime}. Or provide an access token.`);
        }
        throw new Error(`Failed to fetch from GitHub: ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }

    return response.json();
};

export const getRepoData = async (repoUrl: string, token?: string | null): Promise<RepoData> => {
    let owner, repoName;
    try {
        const path = new URL(repoUrl).pathname.split('/').filter(p => p);
        if (path.length < 2) throw new Error();
        [owner, repoName] = path;
    } catch (e) {
        throw new Error("Invalid GitHub repository URL format.");
    }
    
    const repoDetails = await githubFetch(`/repos/${owner}/${repoName}`, token);
    const forksCount = repoDetails.forks_count;

    // Fetch forks
    const forksData: any[] = await githubFetch(`/repos/${owner}/${repoName}/forks?per_page=100&sort=stargazers`, token);

    const forks: Fork[] = await Promise.all(forksData.slice(0, 10).map(async (forkData: any): Promise<Fork> => {
        try {
            const compareData = await githubFetch(`/repos/${forkData.owner.login}/${forkData.name}/compare/${repoDetails.default_branch}...${forkData.default_branch}`, token);
            return {
                id: forkData.id,
                name: forkData.name,
                fullName: forkData.full_name,
                url: forkData.html_url,
                commitCount: compareData.ahead_by,
            };
        } catch (error) {
            console.warn(`Could not compare fork ${forkData.full_name}. Setting commit count to 0.`);
            return {
                id: forkData.id,
                name: forkData.name,
                fullName: forkData.full_name,
                url: forkData.html_url,
                commitCount: 0,
            }
        }
    }));
    
    forks.sort((a, b) => b.commitCount - a.commitCount);

    // Fetch recent committers (contributors)
    const contributorsData: any[] = await githubFetch(`/repos/${owner}/${repoName}/contributors?per_page=10`, token);
    
    const recentCommitters: Committer[] = contributorsData.map((contributor: any) => ({
        name: contributor.login,
        avatarUrl: contributor.avatar_url,
        commits: contributor.contributions,
    }));
    
    recentCommitters.sort((a, b) => b.commits - a.commits);

    return {
        forksCount,
        forks,
        recentCommitters
    };
};
