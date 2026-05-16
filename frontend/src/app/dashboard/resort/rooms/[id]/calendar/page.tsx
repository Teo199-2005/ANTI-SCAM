"use client";

import RoomHostCalendar from "@/components/dashboard/RoomHostCalendar";
import { useParams } from "next/navigation";

export default function RoomCalendarPage() {
  const params = useParams<{ id: string }>();
  const roomId = Number(params?.id);

  if (!Number.isFinite(roomId) || roomId <= 0) {
    return <div className="dash-card p-8 text-center text-rose-700">Invalid room.</div>;
  }

  return <RoomHostCalendar roomId={roomId} />;
}
