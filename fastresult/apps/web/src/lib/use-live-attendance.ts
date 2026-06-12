import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const WS_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/events";

export type LiveUpdate = {
  event: "CHECK_IN" | "CHECK_OUT";
  insideCount: number;
  member: { name: string; email: string };
  time: string;
};

export function useLiveAttendance(clubId?: string | null) {
  const [insideCount, setInsideCount] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<LiveUpdate | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, {
      query: clubId ? { clubId } : {},
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("attendanceUpdate", (data: LiveUpdate) => {
      setInsideCount(data.insideCount);
      setLastUpdate(data);
    });

    return () => { socket.disconnect(); };
  }, [clubId]);

  return { insideCount, lastUpdate, connected };
}
