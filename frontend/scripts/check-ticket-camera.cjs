const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const filename = path.join(__dirname, "../src/components/tournament/TournamentCheckInModal.tsx");
const source = fs.readFileSync(filename, "utf8") + "\nexport { TicketCamera };\n";
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

async function scenario({ pending = false, fail = false, cancelBeforeLoad = false, playing = false }) {
  let cleanup, resolveStart, rejectStart, created = 0, stopped = 0, cleared = 0, errors = 0, scans = 0, callback;
  const track = { readyState: "live" };
  class Scanner {
    isScanning = false;
    constructor() { created++; }
    start(_constraints, _config, success) {
      callback = success;
      const start = pending ? new Promise((resolve, reject) => { resolveStart = resolve; rejectStart = reject; })
        : fail ? Promise.reject(new Error("Camera bị từ chối")) : Promise.resolve();
      return start.then(() => { this.isScanning = playing; });
    }
    async stop() { stopped++; track.readyState = "ended"; }
    clear() { cleared++; }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "react") return { useEffect(effect) { cleanup = effect(); }, useId: () => "camera-test" };
      if (name === "react/jsx-runtime") return { jsx: () => null, jsxs: () => null };
      if (name === "html5-qrcode") return { Html5Qrcode: Scanner, Html5QrcodeSupportedFormats: { QR_CODE: 0 } };
      return {};
    },
  }, { filename });
  exports.TicketCamera({ onScan: () => scans++, onError: () => errors++ });
  if (cancelBeforeLoad) {
    cleanup();
    await flush();
    assert.equal(created, 0);
    return;
  }
  await flush();
  if (pending) {
    cleanup();
    if (fail) rejectStart(new Error("Camera bị từ chối"));
    else resolveStart();
  } else cleanup();
  await flush();
  if (callback) callback("vé đến sau khi đóng");
  assert.equal(scans, 0);
  assert.equal(stopped, fail ? 0 : 1);
  assert.equal(cleared, 1);
  if (!fail) assert.equal(track.readyState, "ended");
  assert.equal(errors, fail && !pending ? 1 : 0);
}

(async () => {
  await scenario({ cancelBeforeLoad: true });
  await scenario({ pending: true });
  await scenario({ playing: false });
  await scenario({ playing: true });
  await scenario({ fail: true });
  await scenario({ pending: true, fail: true });
  console.log("check-ticket-camera: OK (đóng trước import, chờ cấp quyền, chưa playing, đang phát, lỗi start; lifecycle mô phỏng, không thay camera thật)");
})().catch((error) => { console.error(error); process.exitCode = 1; });
