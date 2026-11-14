// Chạy: node frontend/scripts/check-tournament-history.cjs
// Kiểm tra component bằng JSX/hook mô phỏng, không gọi API, đăng nhập hay ghi DB.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const axios = require("axios");
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({ Typography: { Title: "Title", Text: "Text", Paragraph: "Paragraph" } }, {
  get: (target, key) => target[key] || key,
});
const icons = new Proxy({}, { get: (_target, key) => key });

function load(relative, react, services = {}, extra = "") {
  const filename = path.join(__dirname, "../src", relative);
  const source = fs.readFileSync(filename, "utf8") + extra;
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Error,
    require(name) {
      if (name === "react") return react;
      if (name === "axios") return axios;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (name === "react-router-dom") return { useNavigate: () => () => assert.fail("Không được điều hướng đăng nhập") };
      if (name.endsWith("shared/ui")) return ui;
      if (name === "@ant-design/icons") return icons;
      if (name.endsWith("contexts/AuthContext")) return { useAuth: () => ({ user: { _id: "test-user", name: "Cơ thủ kiểm thử" } }) };
      return services[name] || new Proxy({}, { get: (_target, key) => key });
    },
  }, { filename });
  return exports;
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...nodes(node.props?.children)];
}
const text = (node) => Array.isArray(node) ? node.map(text).join("")
  : node && typeof node === "object" ? text(node.props?.children)
    : node == null || node === false ? "" : String(node);

function checkPage(status) {
  let cursor = 0, arraySeed = 0;
  const states = [];
  const history = [{ tournamentId: "test-tournament", tournamentName: "Giải kiểm thử", status,
    feePaid: true, startDate: "2026-01-01", endDate: "2026-01-02", registrationFee: 100000 }];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = index === 1 ? false
        : Array.isArray(initial) ? (arraySeed++ === 0 ? cards : history) : initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useEffect() {}, useCallback: (callback) => callback,
  };
  const module = load("pages/customer/CustomerTournaments.tsx", react, {}, "\nexport { toTournamentCard };\n");
  const card = module.toTournamentCard({ _id: "test-tournament", name: "Giải kiểm thử", status,
    registrationDeadline: "2026-01-01", startDate: "2026-01-01", endDate: "2026-01-02",
    registrationFee: 100000, maxPlayers: 8, players: [] });
  const cards = [{ ...card, isRegistered: true }];
  assert.equal(card.status, status === "completed" ? "finished" : "upcoming");
  const render = () => { cursor = 0; return module.default(); };
  const tree = render();
  const label = status === "completed" ? "Xem kết quả & lịch sử" : "Đã tham gia · Xem chi tiết";
  const button = nodes(tree).find((node) => node.type === "Button" && text(node).trim() === label);
  assert(button, `Thiếu nút ${label}`);
  button.props.onClick();
  const after = render();
  const paymentModals = nodes(after).filter((node) => node.type === "TournamentPaymentModal");
  if (status === "completed") {
    assert.equal(paymentModals.length, 0);
    assert(text(after).includes("Bảng Vàng Thành Tích Của Tôi"));
    assert(text(after).includes("ĐÃ NỘP LỆ PHÍ"));
    assert(!text(after).includes("Xem Thẻ Thi Đấu (E-Pass)"));
  } else {
    assert.equal(paymentModals.length, 1);
    const historyTab = nodes(after).find((node) => node.type === "button" && text(node).includes("Lịch Sử Thi Đấu Của Tôi"));
    assert(historyTab, "Thiếu tab lịch sử thi đấu");
    historyTab.props.onClick();
    assert(text(render()).includes("Xem Thẻ Thi Đấu (E-Pass)"));
  }
}

async function checkError(error, expected) {
  let cursor = 0, effect, cleanup;
  const states = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useEffect(callback) { effect = callback; },
  };
  const module = load("components/tournament/TournamentEPassModal.tsx", react, {
    "../../services/tournament.service": { tournamentService: { getMyPass: async () => { throw error; } } },
  }, "\nexport { TournamentPassCard };\n");
  const render = () => { cursor = 0; return module.TournamentPassCard({ data: { tournamentId: "test-tournament" } }); };
  render();
  cleanup = effect();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  const alert = render();
  assert.equal(alert.type, "Alert");
  assert.equal(alert.props.title, expected);
  cleanup();
}

(async () => {
  checkPage("completed");
  checkPage("in_progress");
  const reason = "Giải đấu đã kết thúc, không thể điểm danh";
  await checkError(new Error(reason), reason);
  const fallback = "Không thể tải vé hợp lệ. Vui lòng tải lại hoặc liên hệ ban tổ chức.";
  const response = { status: 409, statusText: "Conflict", headers: {}, config: {}, data: { message: reason } };
  await checkError(new axios.AxiosError("Request failed with status code 409", "ERR_BAD_REQUEST", undefined, undefined, response), reason);
  await checkError(new axios.AxiosError("Request failed with status code 502", "ERR_BAD_RESPONSE", undefined, undefined, { ...response, status: 502, data: {} }), fallback);
  await checkError(new axios.AxiosError("Network Error", "ERR_NETWORK"), fallback);
  await checkError(new axios.AxiosError("Request failed with status code 409", "ERR_BAD_REQUEST", undefined, undefined, { ...response, data: { message: " " } }), fallback);
  await checkError(new Error(" "), fallback);
  await checkError(null, fallback);
  console.log("OK: giải kết thúc mở lịch sử, giữ thành tích/lệ phí, không mở payment/E-Pass; giải đang diễn ra giữ luồng vé; lỗi hiển thị đúng nguyên nhân (JSX/hook mô phỏng, không API/DB)");
})().catch((error) => { console.error(error); process.exitCode = 1; });
