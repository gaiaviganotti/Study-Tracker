/* --- NATIVE REACT SYNC FOR STUDY TRACKER (NO-LIMIT) --- */
(function() {
  const BIN_ID = "6aeddafaac6210605a726c11";
  const API_KEY = "$2a$10$WwSPCntoB1jPrDMz7j7upufH2GlNnLbA6lbhSxUt8hUbSxIv0gkSe";
  const URL = "https://api.jsonbin.io/v3/b/" + BIN_ID;

  let isSyncing = false;
  let lastTS = parseInt(localStorage.getItem("__sync_ts") || "0", 10);

  async function pushSync() {
    if (isSyncing) return;
    isSyncing = true;
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== "__sync_ts") dump[k] = localStorage.getItem(k);
    }
    const now = Date.now();
    lastTS = now;
    localStorage.setItem("__sync_ts", now.toString());
    try {
      await fetch(URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
        body: JSON.stringify({ updatedAt: now, data: dump }),
        keepalive: true
      });
      console.log("⚡ [React Sync] Inviato al Cloud!");
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => { isSyncing = false; }, 800);
    }
  }

  async function pullSync() {
    if (isSyncing) return;
    try {
      const res = await fetch(URL + "/latest?t=" + Date.now(), {
        headers: { "X-Master-Key": API_KEY }
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.record && json.record.updatedAt && json.record.data) {
        const remoteTS = json.record.updatedAt;
        if (remoteTS > lastTS) {
          lastTS = remoteTS;
          localStorage.setItem("__sync_ts", remoteTS.toString());
          Object.keys(json.record.data).forEach(k => {
            localStorage.setItem(k, json.record.data[k]);
          });
          console.log("🔄 [React Sync] Nuovi dati trovati, aggiornamento...");
          window.location.reload();
        }
      }
    } catch (e) {}
  }

  // Intercetta i cambi di stato React
  const _setItem = localStorage.setItem;
  localStorage.setItem = function(k, v) {
    _setItem.apply(this, arguments);
    if (k !== "__sync_ts" && !isSyncing) {
      setTimeout(pushSync, 300);
    }
  };

  // Sync solo al tocco o quando torni sulla scheda (niente timer automatici in background!)
  window.addEventListener("touchend", () => setTimeout(pushSync, 200), { passive: true });
  window.addEventListener("pointerup", () => setTimeout(pushSync, 200), { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullSync();
    if (document.visibilityState === "hidden") pushSync();
  });

  // Esegui solo un controllo all'avvio
  pullSync();
})();
