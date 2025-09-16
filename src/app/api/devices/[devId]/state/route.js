import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export async function POST(req, { params }) {
  const devId = params.devId;
  const body = await req.json().catch(() => ({}));
  const doc = {
    ...body,
    devId,
    ts: Date.now(),
    ip: req.headers.get("x-forwarded-for") || "unknown",
  };

  const db = await getDb();
  await db.collection("devices").updateOne(
    { devId },
    {
      $set: {
        devId,
        lastState: doc,
        lastSeen: new Date(),
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
