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

    const forks: Fork[] = forksData.map((forkData: any): Fork => {
        return {
            id: forkData.id,
            name: forkData.name,
            fullName: forkData.full_name,
            url: forkData.html_url,
        };
    });
    
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

export const getForkDetails = async (owner: string, repo: string, token?: string | null): Promise<Partial<Fork>> => {
    let commitCount = 0;
    try {
        const { data: forkRepoDetails } = await githubFetch(`/repos/${owner}/${repo}`, token);
        const { headers } = await githubFetch(`/repos/${owner}/${repo}/commits?sha=${forkRepoDetails.default_branch}&per_page=1`, token);
        
        const linkHeader = headers.get('Link');
        if (linkHeader) {
            const links = parseLinkHeader(linkHeader);
            const lastUrl = links.last;
            if (lastUrl) {
                const match = lastUrl.match(/[?&]page=(\d+)/);
                if (match) {
                    commitCount = parseInt(match[1], 10);
                }
            }
        } else {
             const { data: allCommitsOnBranch } = await githubFetch(`/repos/${owner}/${repo}/commits?sha=${forkRepoDetails.default_branch}&per_page=100`, token);
             commitCount = Array.isArray(allCommitsOnBranch) ? allCommitsOnBranch.length : 0;
        }
    } catch (fallbackError) {
         console.error(`Could not fetch commit count for ${owner}/${repo}. Setting commit count to 0.`);
         commitCount = 0;
    }
    
    let topContributor: Committer | null = null;
    try {
         const { data: contributors } = await githubFetch(`/repos/${owner}/${repo}/contributors?per_page=1`, token);
         if (Array.isArray(contributors) && contributors.length > 0) {
             topContributor = {
                 name: contributors[0].login,
                 avatarUrl: contributors[0].avatar_url,
                 commits: contributors[0].contributions,
             };
         }
    } catch (error) {
        console.warn(`Could not fetch contributors for ${owner}/${repo}.`);
    }
    
    let linesAdded = 0;
    try {
         const { data: contributorStats } = await githubFetch(`/repos/${owner}/${repo}/stats/contributors`, token);
         if (Array.isArray(contributorStats)) {
            linesAdded = contributorStats.reduce((acc, stat) => {
                const weeklyAdditions = stat.weeks.reduce((wAcc: number, w: { a: number; }) => wAcc + w.a, 0);
                return acc + weeklyAdditions;
            }, 0);
         }
    } catch(e) {
        console.warn(`Could not fetch contributor stats for ${owner}/${repo}`);
    }

    return {
        commitCount,
        topContributor,
        linesAdded
    };
};


export const getRepoDetails = async(owner: string, repo: string, token?: string | null): Promise<RepoDetails> => {
    // Get contributor stats. This includes additions, deletions, and commit counts.
    const { data: contributorStats } = await githubFetch(`/repos/${owner}/${repo}/stats/contributors`, token);
    
    const contributors: ContributorStat[] = Array.isArray(contributorStats) ? contributorStats : [];

    let totalCommits = 0;
    let linesAdded = 0;
    let linesDeleted = 0;

    // Aggregate commit activity by week
    const weeklyCommits: { [week: string]: number } = {};

    contributors.forEach(stat => {
        totalCommits += stat.total;
        stat.weeks.forEach(week => {
            linesAdded += week.a;
            linesDeleted += week.d;
            
            const weekStart = new Date(week.w * 1000).toISOString().split('T')[0];
            if (!weeklyCommits[weekStart]) {
                weeklyCommits[weekStart] = 0;
            }
            weeklyCommits[weekStart] += week.c;
        });
    });

    const commitActivity = Object.entries(weeklyCommits)
        .map(([week, commits]) => ({ week, commits }))
        .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());


    // Get commits in the last 48 hours
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recentCommits } = await githubFetch(`/repos/${owner}/${repo}/commits?since=${since}`, token);

    return {
        totalCommits,
        linesAdded,
        linesDeleted,
        commitsInLast48Hours: Array.isArray(recentCommits) ? recentCommits.length : 0,
        contributors,
        commitActivity
    }
}

export const getRepoCommits = async (owner: string, repo: string, token?: string | null): Promise<string[]> => {
    try {
        const { data: commitsData } = await githubFetch(`/repos/${owner}/${repo}/commits?per_page=50`, token);
        if (Array.isArray(commitsData)) {
            return commitsData.map(c => c.commit.message);
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch commits:", error);
        return [];
    }
};
