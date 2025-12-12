import 'server-only';
import type { RepoData, Fork, Committer, RepoDetails, ContributorStat } from '@/lib/types';

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
        if (response.status === 404) {
            return { data: [], headers: response.headers };
        }
        throw new Error(`Failed to fetch from GitHub: ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }
    
    if (response.status === 202) { // Accepted, data is being processed
        // Wait and retry
        await new Promise(res => setTimeout(res, 2000));
        return githubFetch(endpoint, token);
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
        if(Array.isArray(data)) {
            results = results.concat(data);
        } else if (data) {
            results.push(data)
        }

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

    const forksData: any[] = await fetchAllPages(`/repos/${owner}/${repoName}/forks?per_page=100&sort=stargazers`, token);

    const forks: Fork[] = await Promise.all(forksData.map(async (forkData: any): Promise<Fork> => {
        try {
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
                const { data: forkRepoDetails } = await githubFetch(`/repos/${forkData.owner.login}/${forkData.name}`, token);
                const { headers } = await githubFetch(`/repos/${forkData.owner.login}/${forkData.name}/commits?sha=${forkRepoDetails.default_branch}&per_page=1`, token);
                
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

    const { data: contributorsData } = await githubFetch(`/repos/${owner}/${repoName}/contributors?per_page=10`, token);
    
    const recentCommitters: Committer[] = Array.isArray(contributorsData) ? contributorsData.map((contributor: any) => ({
        name: contributor.login,
        avatarUrl: contributor.avatar_url,
        commits: contributor.contributions,
    })) : [];
    
    recentCommitters.sort((a, b) => b.commits - a.commits);

    return {
        forksCount,
        forks,
        recentCommitters
    };
};

export const getRepoDetails = async(owner: string, repo: string, token?: string | null): Promise<RepoDetails> => {
    // Get contributor stats. This includes additions, deletions, and commit counts.
    const { data: contributorStats } = await githubFetch(`/repos/${owner}/${repo}/stats/contributors`, token);
    
    const contributors: ContributorStat[] = Array.isArray(contributorStats) ? contributorStats : [];

    let totalCommits = 0;
    let linesAdded = 0;
    let linesDeleted = 0;
    contributors.forEach(stat => {
        totalCommits += stat.total;
        stat.weeks.forEach(week => {
            linesAdded += week.a;
            linesDeleted += week.d;
        });
    });

    // Get commits in the last 48 hours
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recentCommits } = await githubFetch(`/repos/${owner}/${repo}/commits?since=${since}`, token);

    return {
        totalCommits,
        linesAdded,
        linesDeleted,
        commitsInLast48Hours: Array.isArray(recentCommits) ? recentCommits.length : 0,
        contributors
    }
}
