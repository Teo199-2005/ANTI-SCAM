"use client";

import { useParams } from "next/navigation";
import RoomEditorPage from "@/components/dashboard/RoomEditorPage";

export default function EditRoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = Number(params?.id);
  return <RoomEditorPage mode="edit" roomId={Number.isFinite(roomId) ? roomId : undefined} />;
}

