import { useEffect, useState } from "react";
import { Alert, Button, Checkbox } from "../../shared/ui";
import { tournamentService, type TournamentPaymentSnapshot } from "../../services/tournament.service";

export function TournamentPaymentReconciliation({ id, onFinalized }: { id: string; onFinalized: () => Promise<void> }) {
  const [snapshot, setSnapshot] = useState<TournamentPaymentSnapshot | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    tournamentService.getPayments(id).then(data => { if (active) setSnapshot(data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Không tải được đối soát"); });
    return () => { active = false; };
  }, [id]);
  async function run(finalize: boolean) {
    if (finalize && (!snapshot || !checked)) return;
    setBusy(true);
    setError("");
    setChecked(false);
    try {
      const running = snapshot && ["bracket_generated", "in_progress", "completed"].includes(snapshot.status);
      setSnapshot(finalize ? running ? await tournamentService.acknowledgePayments(id, snapshot!.revision) : await tournamentService.finalizePayments(id, snapshot!.revision) : await tournamentService.getPayments(id));
      if (finalize) await onFinalized();
    }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể đối soát. Hãy tải lại danh sách."); }
    finally { setBusy(false); }
  }
  const running = snapshot && ["bracket_generated", "in_progress", "completed"].includes(snapshot.status);
  return <section className="space-y-4 border-t border-border-standard pt-5 text-sm text-text-main">
    <h3 className="text-base font-semibold">Đối soát chuyển khoản SePay</h3>
    {error && <Alert type="error" title={error} />}
    {snapshot && <>
      <p aria-live="polite">{snapshot.finalizedAt && !snapshot.reconciliationRequired ? "Đã chốt danh sách" : "Chờ đối soát / chốt danh sách"} · {snapshot.capacity} suất dành cho chuyển khoản mới</p>
      {snapshot.reconciliationRequired && <Alert type="warning" title="Có giao dịch cần đối soát. Không coi danh sách hiện tại là kết quả cuối cùng." />}
      <p>So sánh toàn bộ giao dịch với sao kê ngân hàng/SePay. Người không có suất hoặc chuyển sai/thừa tiền cần liên hệ Zalo nhân viên và gửi ảnh bill để yêu cầu hoàn thủ công.</p>
      <ul className="max-h-60 space-y-3 overflow-y-auto">{snapshot.candidates.map(c => <li key={c.userId} className="border-b border-border-divider pb-2">
        <strong>{c.rank}. {c.name}</strong> — {c.provisionalSeat ? "Trong suất dự kiến" : "Ngoài suất dự kiến"}<br />
        {c.amount.toLocaleString("vi-VN")}đ · {new Date(c.bankPaidAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}<br /><span className="break-all font-mono">{c.reference} · ID {c.providerId}</span>
      </li>)}</ul>
      <details><summary className="cursor-pointer py-2">Toàn bộ tiền nhận của giải ({snapshot.receipts.length})</summary><ul className="max-h-48 space-y-2 overflow-y-auto">{snapshot.receipts.map(r => <li key={r.providerId} className="break-all">ID {r.providerId} · {r.amount.toLocaleString("vi-VN")}đ · {r.reference || "Không khớp mã"} · {new Date(r.bankPaidAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</li>)}</ul></details>
      {running && <Alert type="info" title="Giải đã vận hành: xác nhận đối soát chỉ ghi nhận nhân viên đã xử lý giao dịch trễ/hoàn tiền, không thay đổi danh sách thi đấu." />}
      <Checkbox checked={checked} disabled={busy} onChange={e => setChecked(e.target.checked)}>Tôi đã đối soát danh sách này với sao kê/SePay, gồm giao dịch đến trễ, và xác nhận chốt theo thời gian ngân hàng.</Checkbox>
      <p className="text-text-secondary">Chỉ chốt sau hạn {new Date(snapshot.deadline).toLocaleString("vi-VN")}. Tải lại danh sách sẽ yêu cầu xác nhận đối soát lại.</p>
    </>}
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" loading={busy} onClick={() => void run(false)}>Tải lại đối soát</Button>
      <Button loading={busy} disabled={!snapshot || !checked} onClick={() => void run(true)}>{running ? "Xác nhận đã xử lý sai lệch (giữ nguyên cơ thủ)" : "Chốt danh sách đã đối soát"}</Button>
    </div>
  </section>;
}
