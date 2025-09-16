import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { Cmd } from "@/lib/schema";

function noStore(json, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(_req, { params }) {
  const db = await getDb();
  const dev = await db
    .collection("devices")
    .findOne({ devId: params.devId }, { projection: { lastCommand: 1 } });
  const payload = dev?.lastCommand ?? {
    mode: "off",
    color: "#000000",
    brightness: 0,
    speed: 5,
    segment: [1, 59],
    duration: 0,
  };
  return noStore(payload);
}

export async function POST(req, { params }) {
  const devId = params.devId;
  const ctype = req.headers.get("content-type") || "";
  let body = null;

  if (ctype.includes("application/json")) {
    body = await req.json().catch(() => null);
  } else if (ctype.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const raw = form.get("json");
    body = raw ? JSON.parse(raw) : null;
  }

  const parse = Cmd.safeParse(body);
  if (!parse.success) return noStore({ error: parse.error.message }, 400);
  const cmd = parse.data;

  const db = await getDb();
  await db.collection("devices").updateOne(
    { devId },
    {
      $set: { devId, lastCommand: cmd, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return noStore({ ok: true, devId, cmd });
}
