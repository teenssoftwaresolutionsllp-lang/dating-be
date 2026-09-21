// Report Model placeholder for reports domain
export interface ReportSchema {
  id?: number;
  reporterId: number;
  reportedUserId: number;
  reason: string;
  createdAt?: Date;
}
