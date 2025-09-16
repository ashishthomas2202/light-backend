import { getDb } from "@/lib/mongo";

async function getDevices() {
  const db = await getDb();
  const devices = await db
    .collection("devices")
    .find({}, { projection: { _id: 0 } })
    .sort({ lastSeen: -1 })
    .toArray();
  return devices;
}

export default async function ConsolePage() {
  const devices = await getDevices();

  return (
    <main
      style={{
        fontFamily: "system-ui",
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1>Light Console</h1>
      {devices.length === 0 && (
        <p>No devices yet. Once an ESP posts state, it’ll appear here.</p>
      )}

      {devices.map((d) => (
        <div
          key={d.devId}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginTop: 16,
          }}
        >
          <h3>{d.devId}</h3>
          <p>
            <b>Last seen:</b>{" "}
            {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "never"}
          </p>
          <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 6 }}>
            {JSON.stringify(
              { state: d.lastState, cmd: d.lastCommand },
              null,
              2
            )}
          </pre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input
                type="hidden"
                name="json"
                value='{"mode":"solid","color":"#00FF00","brightness":220,"duration":10}'
              />
              <button type="submit">Green 10s</button>
            </form>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input
                type="hidden"
                name="json"
                value='{"mode":"breathe","color":"#33CCFF","brightness":180,"speed":4,"duration":20}'
              />
              <button type="submit">Breathe Cyan</button>
            </form>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input
                type="hidden"
                name="json"
                value='{"mode":"rainbow","speed":6,"brightness":255,"duration":30}'
              />
              <button type="submit">Rainbow</button>
            </form>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input type="hidden" name="json" value='{"mode":"off"}' />
              <button type="submit">Off</button>
            </form>
          </div>
        </div>
      ))}

      <style jsx>{`
        button {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #ccc;
          background: #fff;
          cursor: pointer;
        }
        button:hover {
          background: #f2f2f2;
        }
      `}</style>
    </main>
  );
}
