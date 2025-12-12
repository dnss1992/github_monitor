import type { RepoData, Fork, Committer } from '@/lib/types';

// Simple pseudo-random generator for deterministic results based on URL
const seededRandom = (seed: number) => {
    let state = seed;
    return () => {
        const x = Math.sin(state++) * 10000;
        return x - Math.floor(x);
    };
};

const generateSeed = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};


const firstNames = ['Ada', 'Grace', 'Linus', 'Guido', 'Brendan', 'Yukihiro', 'Rasmus', 'Bjarne', 'John', 'Jane'];
const lastNames = ['Lovelace', 'Hopper', 'Torvalds', 'van Rossum', 'Eich', 'Matsumoto', 'Lerdorf', 'Stroustrup', 'Doe', 'Smith'];

export const getMockRepoData = async (repoUrl: string): Promise<RepoData> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const seed = generateSeed(repoUrl);
    const random = seededRandom(seed);
    
    let owner, repoName;
    try {
        const path = new URL(repoUrl).pathname.split('/').filter(p => p);
        if (path.length < 2) throw new Error();
        [owner, repoName] = path;
    } catch(e) {
        throw new Error("Invalid GitHub repository URL format.");
    }

    const forksCount = Math.floor(random() * 50) + 5;
    const forks: Fork[] = [];
    for (let i = 0; i < forksCount; i++) {
        const user = `${firstNames[Math.floor(random() * firstNames.length)]}${lastNames[Math.floor(random() * lastNames.length)]}${Math.floor(random() * 100)}`;
        forks.push({
            id: i,
            name: `${user}/${repoName}`,
            fullName: `${user}/${repoName}`,
            url: `https://github.com/${user}/${repoName}`,
            commitCount: Math.floor(random() * 200) + 1
        });
    }
    
    forks.sort((a, b) => b.commitCount - a.commitCount);

    const recentCommittersCount = Math.min(forksCount, Math.floor(random() * 5) + 3);
    const recentCommitters: Committer[] = [];
    const usedNames = new Set();

    for (let i = 0; i < recentCommittersCount; i++) {
        let name;
        do {
            name = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
        } while (usedNames.has(name));
        usedNames.add(name);

        recentCommitters.push({
            name: name,
            avatarUrl: `https://i.pravatar.cc/40?u=${name.replace(' ', '')}`,
            commits: Math.floor(random() * 30) + 1,
        });
    }
    
    recentCommitters.sort((a, b) => b.commits - a.commits);

    return {
        forksCount,
        forks,
        recentCommitters
    };
};
