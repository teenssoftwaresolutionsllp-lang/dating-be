// Profile Model placeholder for profiles domain
export interface ProfileSchema {
  id?: number;
  userId: number;
  displayName?: string;
  bio?: string;
  birthDate?: string;
  gender?: string;
  photos?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
