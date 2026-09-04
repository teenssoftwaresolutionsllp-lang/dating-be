// Message Model placeholder for messages domain
export interface MessageSchema {
  id?: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt?: Date;
}
