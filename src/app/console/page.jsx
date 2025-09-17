"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const POLL_MS = 3000; // refresh list every 3s
const ONLINE_GRACE_MS = 35000; // <= 35s since lastSeen => online (matches device heartbeat 30s)

function timeAgo(ts) {
  if (!ts) return "never";
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function ConsolePage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [busy, setBusy] = useState({}); // { [devId]: boolean }
  const [flash, setFlash] = useState({}); // { [devId]: "ok"|"err"|undefined }
  const timerRef = useRef(null);

  const onlineCount = useMemo(() => {
    return devices.filter(
      (d) =>
        d.lastSeen &&
        Date.now() - new Date(d.lastSeen).getTime() <= ONLINE_GRACE_MS
    ).length;
  }, [devices]);

  async function fetchDevices() {
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      const json = await res.json();
      setDevices(json.devices || []);
      setLastRefresh(Date.now());
    } catch (e) {
      console.error("fetchDevices err", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDevices();
    timerRef.current = setInterval(fetchDevices, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  async function sendCmd(devId, cmd) {
    try {
      setBusy((prev) => ({ ...prev, [devId]: true }));
      const res = await fetch(`/api/devices/${devId}/command`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cmd),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // optimistic: mark card as “ok” pulse and update its lastCommand locally
      setFlash((prev) => ({ ...prev, [devId]: "ok" }));
      setDevices((prev) =>
        prev.map((d) =>
          d.devId === devId
            ? { ...d, lastCommand: cmd, updatedAt: new Date().toISOString() }
            : d
        )
      );
      setTimeout(
        () => setFlash((prev) => ({ ...prev, [devId]: undefined })),
        1000
      );
    } catch (e) {
      console.error("sendCmd err", e);
      setFlash((prev) => ({ ...prev, [devId]: "err" }));
      setTimeout(
        () => setFlash((prev) => ({ ...prev, [devId]: undefined })),
        1600
      );
    } finally {
      setBusy((prev) => ({ ...prev, [devId]: false }));
    }
  }

  const headerPulse = useMemo(() => {
    // a tiny ping animation on each refresh tick
    return Date.now() - lastRefresh < 600 ? "after:animate-ping" : "";
  }, [lastRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/60 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Light Console
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span
                className={`h-3 w-3 rounded-full bg-emerald-400 inline-block ${headerPulse} after:absolute after:inset-0 after:rounded-full after:bg-emerald-400/60`}
              />
            </div>
            <span className="text-sm text-slate-300">
              {onlineCount} online / {devices.length} total
            </span>
            <button
              onClick={fetchDevices}
              className="ml-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-20 text-slate-300">
            No devices yet. Once an ESP posts state, it’ll appear here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
            {devices.map((d) => {
              const online =
                d.lastSeen &&
                Date.now() - new Date(d.lastSeen).getTime() <= ONLINE_GRACE_MS;
              const badge = online ? "bg-emerald-500" : "bg-slate-600";
              const flashState = flash[d.devId];
              return (
                <div
                  key={d.devId}
                  className={`group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 transition hover:border-slate-700 ${
                    flashState === "ok"
                      ? "ring-2 ring-emerald-400"
                      : flashState === "err"
                      ? "ring-2 ring-rose-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${badge}`} />
                        <h3 className="text-lg font-medium tracking-tight">
                          {d.devId}
                        </h3>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Last seen: {d.lastSeen ? timeAgo(d.lastSeen) : "never"}{" "}
                        {online ? "(online)" : "(offline)"}
                      </div>
                      {d.lastState?.rssi !== undefined && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          RSSI: {d.lastState.rssi} dBm
                        </div>
                      )}
                    </div>

                    {/* Mode chip */}
                    <div className="text-xs rounded-full bg-slate-800 border border-slate-700 px-2 py-1 text-slate-300">
                      {d.lastCommand?.mode ?? "off"}
                    </div>
                  </div>

                  {/* Pretty JSON preview */}
                  <pre className="mt-3 h-28 overflow-auto rounded-xl bg-slate-950/70 p-3 text-xs text-slate-300 border border-slate-800">
                    {JSON.stringify(
                      { state: d.lastState, cmd: d.lastCommand },
                      null,
                      2
                    )}
                  </pre>

                  {/* Actions */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {/* Basic */}
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="Off"
                      onClick={() => sendCmd(d.devId, { mode: "off" })}
                    />
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="Solid Green"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "solid",
                          color: "#00FF00",
                          brightness: 220,
                          duration: 10,
                        })
                      }
                    />
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="Breathe Cyan"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "breathe",
                          color: "#33CCFF",
                          brightness: 200,
                          speed: 4,
                          duration: 20,
                        })
                      }
                    />
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="Rainbow"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "rainbow",
                          brightness: 255,
                          speed: 6,
                          duration: 30,
                        })
                      }
                    />

                    {/* Matrix specials */}
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="MX Rainbow Diag"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "mx_rainbow_diag",
                          brightness: 255,
                          speed: 6,
                          duration: 20,
                        })
                      }
                    />
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="MX Wave"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "mx_wave",
                          color: "#33AAFF",
                          brightness: 220,
                          speed: 6,
                          duration: 20,
                        })
                      }
                    />
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="MX Sparkle"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "mx_sparkle",
                          color: "#FFD200",
                          brightness: 255,
                          speed: 7,
                          duration: 20,
                        })
                      }
                    />
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="MX Sunrise"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "mx_sunrise",
                          brightness: 255,
                          speed: 5,
                          duration: 30,
                        })
                      }
                    />
                    <CmdBtn
                      busy={!!busy[d.devId]}
                      label="MX Fire"
                      onClick={() =>
                        sendCmd(d.devId, {
                          mode: "mx_fire",
                          brightness: 255,
                          speed: 6,
                          duration: 30,
                        })
                      }
                    />
                  </div>

                  {/* Glow on hover */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-slate-800/50 transition group-hover:ring-slate-600/60" />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CmdBtn({ label, onClick, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`relative flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition
        ${
          busy
            ? "border-slate-700 bg-slate-800 text-slate-400"
            : "border-slate-700 bg-slate-800 hover:bg-slate-700 hover:-translate-y-0.5"
        }
      `}
    >
      {busy && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-slate-300" />
      )}
      <span>{label}</span>
    </button>
  );
}

// import { getDb } from "@/lib/mongo";

// export const dynamic = "force-dynamic"; // render on server each request

// async function getDevices() {
//   const db = await getDb();
//   const devices = await db
//     .collection("devices")
//     .find({}, { projection: { _id: 0 } })
//     .sort({ lastSeen: -1 })
//     .toArray();
//   return devices;
// }

// export default async function ConsolePage() {
//   const devices = await getDevices();

//   const mainStyle = {
//     fontFamily: "system-ui",
//     padding: 24,
//     maxWidth: 900,
//     margin: "0 auto",
//   };
//   const cardStyle = {
//     border: "1px solid #ddd",
//     borderRadius: 8,
//     padding: 16,
//     marginTop: 16,
//   };
//   const preStyle = {
//     background: "#f7f7f7",
//     padding: 12,
//     borderRadius: 6,
//     overflowX: "auto",
//   };
//   const rowStyle = { display: "flex", gap: 8, flexWrap: "wrap" };
//   const btnStyle = {
//     padding: "8px 12px",
//     borderRadius: 8,
//     border: "1px solid #ccc",
//     background: "#fff",
//     cursor: "pointer",
//   };

//   return (
//     <main style={mainStyle}>
//       <h1>Light Console</h1>
//       {devices.length === 0 && (
//         <p>No devices yet. Once an ESP posts state, it’ll appear here.</p>
//       )}

//       {devices.map((d) => (
//         <div key={d.devId} style={cardStyle}>
//           <h3>{d.devId}</h3>
//           <p>
//             <b>Last seen:</b>{" "}
//             {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "never"}
//           </p>
//           <pre style={preStyle}>
//             {JSON.stringify(
//               { state: d.lastState, cmd: d.lastCommand },
//               null,
//               2
//             )}
//           </pre>

//           <div style={rowStyle}>
//             <form action={`/api/devices/${d.devId}/command`} method="post">
//               <input
//                 type="hidden"
//                 name="json"
//                 value='{"mode":"solid","color":"#00FF00","brightness":220,"duration":10}'
//               />
//               <button type="submit" style={btnStyle}>
//                 Green 10s
//               </button>
//             </form>
//             <form action={`/api/devices/${d.devId}/command`} method="post">
//               <input
//                 type="hidden"
//                 name="json"
//                 value='{"mode":"breathe","color":"#33CCFF","brightness":180,"speed":4,"duration":20}'
//               />
//               <button type="submit" style={btnStyle}>
//                 Breathe Cyan
//               </button>
//             </form>
//             <form action={`/api/devices/${d.devId}/command`} method="post">
//               <input
//                 type="hidden"
//                 name="json"
//                 value='{"mode":"rainbow","speed":6,"brightness":255,"duration":30}'
//               />
//               <button type="submit" style={btnStyle}>
//                 Rainbow
//               </button>
//             </form>
//             <form action={`/api/devices/${d.devId}/command`} method="post">
//               <input type="hidden" name="json" value='{"mode":"off"}' />
//               <button type="submit" style={btnStyle}>
//                 Off
//               </button>
//             </form>
//           </div>
//         </div>
//       ))}
//     </main>
//   );
// }
