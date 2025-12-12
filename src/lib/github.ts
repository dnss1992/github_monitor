import type { RepoData, Fork, Committer } from '@/lib/types';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

const githubFetch = async (endpoint: string, token?: string | null): Promise<{ data: any, headers: Headers }> => {
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
    const data = await response.json();
    return { data, headers: response.headers };
};

const parseLinkHeader = (header: string | null): { [key: string]: string } => {
    if (!header) {
        return {};
    }
    const links: { [key: string]: string } = {};
    const parts = header.split(',');
    parts.forEach(p => {
        const section = p.split(';');
        if (section.length !== 2) {
            return;
        }
        const url = section[0].replace(/<(.*)>/, '$1').trim();
        const name = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[name] = url;
    });
    return links;
}

const fetchAllPages = async (url: string, token?: string | null): Promise<any[]> => {
    let results: any[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
        const endpoint = nextUrl.replace(GITHUB_API_URL, '');
        const { data, headers } = await githubFetch(endpoint, token);
        results = results.concat(data);

        const links = parseLinkHeader(headers.get('Link'));
        nextUrl = links.next || null;
    }

    return results;
}


export const getRepoData = async (repoUrl: string, token?: string | null): Promise<RepoData> => {
    let owner, repoName;
    try {
        const path = new URL(repoUrl).pathname.split('/').filter(p => p);
        if (path.length < 2) throw new Error();
        [owner, repoName] = path;
    } catch (e) {
        throw new Error("Invalid GitHub repository URL format.");
    }
    
    const { data: repoDetails } = await githubFetch(`/repos/${owner}/${repoName}`, token);
    const forksCount = repoDetails.forks_count;

    // Fetch all forks using pagination
    const forksData: any[] = await fetchAllPages(`/repos/${owner}/${repoName}/forks?per_page=100&sort=stargazers`, token);

    const forks: Fork[] = await Promise.all(forksData.map(async (forkData: any): Promise<Fork> => {
        try {
            // First, try to get commits ahead of parent
            const { data: compareData } = await githubFetch(`/repos/${forkData.owner.login}/${forkData.name}/compare/${repoDetails.default_branch}...${forkData.default_branch}`, token);
            return {
                id: forkData.id,
                name: forkData.name,
                fullName: forkData.full_name,
                url: forkData.html_url,
                commitCount: compareData.ahead_by,
            };
        } catch (error) {
            console.warn(`Could not compare fork ${forkData.full_name}. Falling back to total commit count.`);
            try {
                // Fallback: get total commits on the fork's default branch
                const { data: forkRepoDetails } = await githubFetch(`/repos/${forkData.owner.login}/${forkData.name}`, token);
                const { data: commitsData, headers } = await githubFetch(`/repos/${forkData.owner.login}/${forkData.name}/commits?sha=${forkRepoDetails.default_branch}&per_page=1`, token);
                
                // The total commit count is in the Link header for paginated results.
                const linkHeader = headers.get('Link');
                if (linkHeader) {
                    const links = parseLinkHeader(linkHeader);
                    const lastUrl = links.last;
                    if (lastUrl) {
                        const match = lastUrl.match(/&page=(\d+)/);
                        if (match) {
                            return {
                               id: forkData.id,
                                name: forkData.name,
                                fullName: forkData.full_name,
                                url: forkData.html_url,
                                commitCount: parseInt(match[1], 10),
                            };
                        }
                    }
                }
                 // If there's no Link header, it means there's only one page of commits.
                 // The length of the commitsData array is the count. But with per_page=1 it would be just 1.
                 // Let's try to get a better count. If there are no commits, this will be an empty array.
                 const { data: allCommitsOnBranch } = await githubFetch(`/repos/${forkData.owner.login}/${forkData.name}/commits?sha=${forkRepoDetails.default_branch}`, token);

                 return {
                    id: forkData.id,
                    name: forkData.name,
                    fullName: forkData.full_name,
                    url: forkData.html_url,
                    commitCount: Array.isArray(allCommitsOnBranch) ? allCommitsOnBranch.length : 0,
                };
            } catch (fallbackError) {
                 console.error(`Could not fetch commit count for ${forkData.full_name}. Setting commit count to 0.`);
                 return {
                    id: forkData.id,
                    name: forkData.name,
                    fullName: forkData.full_name,
                    url: forkData.html_url,
                    commitCount: 0,
                };
            }
        }
    }));
    
    forks.sort((a, b) => b.commitCount - a.commitCount);

    // Fetch recent committers (contributors)
    const { data: contributorsData } = await githubFetch(`/repos/${owner}/${repoName}/contributors?per_page=10`, token);
    
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