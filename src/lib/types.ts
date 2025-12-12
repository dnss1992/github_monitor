export interface Fork {
  id: number;
  name: string;
  fullName: string;
  url: string;
  commitCount: number;
  topContributor: Committer | null;
}

export interface Committer {
  name: string;
  avatarUrl: string;
  commits: number;
}

export interface RepoData {
  forksCount: number;
  forks: Fork[];
  recentCommitters: Committer[];
}

export interface ContributorStat {
  author: {
    login: string;
    avatar_url: string;
  };
  total: number;
  weeks: { w: number; a: number; d: number; c: number }[];
}

export interface StackInfo {
  name: string;
  category: string;
  logo: string;
  url: string;
}

export interface RepoDetails {
  totalCommits: number;
  linesAdded: number;
  linesDeleted: number;
  commitsInLast48Hours: number;
  contributors: ContributorStat[];
  stack: StackInfo[];
}