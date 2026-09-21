// Match Model placeholder for matches domain
export interface MatchSchema {
  id?: number;
  userId: number;
  targetUserId: number;
  isMatch: boolean;
  createdAt?: Date;
}
