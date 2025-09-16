import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "lights";
if (!uri) throw new Error("Missing MONGODB_URI");

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  const c = await clientPromise;
  const db = c.db(dbName);
  // idempotent indexes
  await db.collection("devices").createIndex({ devId: 1 }, { unique: true });
  await db.collection("devices").createIndex({ lastSeen: -1 });
  return db;
}
