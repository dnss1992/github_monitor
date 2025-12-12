export interface Fork {
  id: number;
  name: string;
  fullName: string;
  url: string;
  commitCount: number;
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
