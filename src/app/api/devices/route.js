import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export async function GET() {
  const db = await getDb();
  const devices = await db
    .collection("devices")
    .find({}, { projection: { _id: 0 } })
    .sort({ lastSeen: -1 })
    .toArray();

  return NextResponse.json(
    { devices },
    { headers: { "Cache-Control": "no-store" } }
  );
}
