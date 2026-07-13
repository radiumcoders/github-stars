export interface Stargazer {
  login: string;
  avatar_url: string;
  starred_at: string;
  html_url: string;
}

export interface StargazerData {
  owner: string;
  repo: string;
  total_stars: number;
  updated_at: string;
  stargazers: Stargazer[];
}

export interface WallAnimationState {
  isPlaying: boolean;
  speedMs: number;
  visibleCount: number;
  isComplete: boolean;
}

export const DEFAULT_REPO = "jal-co/shieldcn";
export const MAX_WALL_AVATARS = 48;
export const MIN_SPEED_MS = 40;
export const MAX_SPEED_MS = 400;
export const DEFAULT_SPEED_MS = 120;