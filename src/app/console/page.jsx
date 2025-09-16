import { getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic"; // render on server each request

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

  const mainStyle = {
    fontFamily: "system-ui",
    padding: 24,
    maxWidth: 900,
    margin: "0 auto",
  };
  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  };
  const preStyle = {
    background: "#f7f7f7",
    padding: 12,
    borderRadius: 6,
    overflowX: "auto",
  };
  const rowStyle = { display: "flex", gap: 8, flexWrap: "wrap" };
  const btnStyle = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  };

  return (
    <main style={mainStyle}>
      <h1>Light Console</h1>
      {devices.length === 0 && (
        <p>No devices yet. Once an ESP posts state, it’ll appear here.</p>
      )}

      {devices.map((d) => (
        <div key={d.devId} style={cardStyle}>
          <h3>{d.devId}</h3>
          <p>
            <b>Last seen:</b>{" "}
            {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "never"}
          </p>
          <pre style={preStyle}>
            {JSON.stringify(
              { state: d.lastState, cmd: d.lastCommand },
              null,
              2
            )}
          </pre>

          <div style={rowStyle}>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input
                type="hidden"
                name="json"
                value='{"mode":"solid","color":"#00FF00","brightness":220,"duration":10}'
              />
              <button type="submit" style={btnStyle}>
                Green 10s
              </button>
            </form>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input
                type="hidden"
                name="json"
                value='{"mode":"breathe","color":"#33CCFF","brightness":180,"speed":4,"duration":20}'
              />
              <button type="submit" style={btnStyle}>
                Breathe Cyan
              </button>
            </form>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input
                type="hidden"
                name="json"
                value='{"mode":"rainbow","speed":6,"brightness":255,"duration":30}'
              />
              <button type="submit" style={btnStyle}>
                Rainbow
              </button>
            </form>
            <form action={`/api/devices/${d.devId}/command`} method="post">
              <input type="hidden" name="json" value='{"mode":"off"}' />
              <button type="submit" style={btnStyle}>
                Off
              </button>
            </form>
          </div>
        </div>
      ))}
    </main>
  );
}
