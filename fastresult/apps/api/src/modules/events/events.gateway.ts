import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/events",
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const clubId = client.handshake.query["clubId"] as string | undefined;
    if (clubId) client.join(`club:${clubId}`);
    client.join("global");
  }

  handleDisconnect(_client: Socket) {}

  /** Broadcast live attendance update to all clients of a club */
  emitAttendanceUpdate(clubId: string | null, data: unknown) {
    const room = clubId ? `club:${clubId}` : "global";
    this.server.to(room).emit("attendanceUpdate", data);
  }

  @SubscribeMessage("ping")
  handlePing() {
    return { event: "pong", data: Date.now() };
  }
}
