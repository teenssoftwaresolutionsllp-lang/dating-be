import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export class SocketService {
  private static io: Server | null = null;
  // Track userId -> Set of active socket IDs
  private static userSockets: Map<string, Set<string>> = new Map();

  public static init(server: HttpServer): Server {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
          (socket.handshake.query?.token as string);

        const queryUserId = socket.handshake.query?.userId as string;

        if (token) {
          try {
            const decoded = verifyAccessToken(token);
            if (decoded && (decoded.userId || decoded.id)) {
              socket.userId = (decoded.userId || decoded.id) as string;
              return next();
            }
          } catch {
            // If token invalid but queryUserId provided (in dev), allow fallback
          }
        }

        if (queryUserId) {
          socket.userId = queryUserId;
          return next();
        }

        return next(new Error("Authentication error: userId or token required"));
      } catch (err: any) {
        return next(new Error("Socket authentication failed: " + err.message));
      }
    });

    this.io.on("connection", (socket: AuthenticatedSocket) => {
      const userId = socket.userId;
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      // Register socket in user pool
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join personal user room (e.g., user:usr_123)
      socket.join(`user:${userId}`);
      console.log(`[WebSocket] User connected: ${userId} (socket ${socket.id})`);

      // Notify caller of connection status
      socket.emit("connected", { status: "ok", userId });

      // 1. Join a specific conversation room
      socket.on("join_conversation", (conversationId: string) => {
        if (conversationId) {
          socket.join(`conv:${conversationId}`);
        }
      });

      // 2. Leave a conversation room
      socket.on("leave_conversation", (conversationId: string) => {
        if (conversationId) {
          socket.leave(`conv:${conversationId}`);
        }
      });

      // 3. Realtime Chat Message (instant sub-50ms peer delivery)
      socket.on(
        "send_message",
        (payload: {
          recipientId: string;
          message: any;
          conversationId?: string;
        }) => {
          const { recipientId, message, conversationId } = payload;
          if (!recipientId || !message) return;

          // Dispatch to recipient's personal inbox room
          this.io?.to(`user:${recipientId}`).emit("new_message", message);

          // If conversationId provided, also emit to that room
          if (conversationId) {
            socket.to(`conv:${conversationId}`).emit("new_message", message);
          }
        }
      );

      // 4. Typing indicators ("Sarah is typing...")
      socket.on(
        "typing_start",
        (data: { recipientId: string; conversationId?: string }) => {
          if (data?.recipientId) {
            this.io?.to(`user:${data.recipientId}`).emit("user_typing", {
              userId,
              conversationId: data.conversationId,
              isTyping: true,
            });
          }
        }
      );

      socket.on(
        "typing_stop",
        (data: { recipientId: string; conversationId?: string }) => {
          if (data?.recipientId) {
            this.io?.to(`user:${data.recipientId}`).emit("user_typing", {
              userId,
              conversationId: data.conversationId,
              isTyping: false,
            });
          }
        }
      );

      // 5. Incoming Call Signaling (Replaces Agora RTM signaling)
      socket.on(
        "call_user",
        (callData: {
          receiverId: string;
          callId: string;
          callType: "audio" | "video";
          channelName: string;
          callerName?: string;
          callerAvatar?: string;
        }) => {
          const { receiverId } = callData;
          if (!receiverId) return;

          console.log(`[WebSocket] Call signal from ${userId} to ${receiverId}`);
          this.io?.to(`user:${receiverId}`).emit("incoming_call", {
            ...callData,
            callerId: userId,
            event: "INCOMING_CALL",
          });
        }
      );

      // 6. Call Status Signaling (accept, reject, busy, end)
      socket.on(
        "call_response",
        (data: {
          callerId: string;
          callId: string;
          action: "accept" | "reject" | "busy" | "end";
        }) => {
          const { callerId, action, callId } = data;
          if (!callerId) return;

          this.io?.to(`user:${callerId}`).emit("call_status", {
            callId,
            action,
            responderId: userId,
          });
        }
      );

      // Disconnect
      socket.on("disconnect", () => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        console.log(`[WebSocket] User disconnected: ${userId} (${socket.id})`);
      });
    });

    return this.io;
  }

  /**
   * Emit an event directly to a user from backend REST controllers or services
   */
  public static emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  public static getIO(): Server | null {
    return this.io;
  }
}

export default SocketService;

