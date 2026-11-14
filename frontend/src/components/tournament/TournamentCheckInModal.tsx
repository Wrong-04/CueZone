import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CameraOutlined, CheckOutlined, StopOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal } from "../../shared/ui";
import { tournamentService, type TournamentCheckIn } from "../../services/tournament.service";

function TicketCamera({ onScan, onError }: { onScan: (code: string) => void; onError: () => void }) {
  const id = `ticket-camera-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    let cancelled = false;
    let delivered = false;
    let started = false;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    const starting = import("html5-qrcode").then(async ({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (cancelled) return;
      scanner = new Html5Qrcode(id, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      await scanner.start({ facingMode: "environment" }, { fps: 8 }, (code) => {
        if (!cancelled && !delivered) { delivered = true; onScan(code); }
      }, () => undefined);
      started = true;
    }).catch(() => { if (!cancelled) onError(); });
    return () => {
      cancelled = true;
      void starting.then(async () => {
        if (started) await scanner!.stop();
        scanner?.clear();
      }).catch(() => undefined);
    };
  }, [id, onScan, onError]);
  return <div id={id} className="overflow-hidden rounded-xl border border-border-standard" aria-label="Camera quét mã vé" />;
}

export function TournamentCheckInModal({ tournamentId, onClose, onCheckedIn }: {
  tournamentId: string;
  onClose: () => void;
  onCheckedIn: () => void;
}) {
  const [code, setCode] = useState("");
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ ticket: string; data: TournamentCheckIn } | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => () => { generation.current++; }, []);

  const check = useCallback(async (ticket: string) => {
    const request = ++generation.current;
    setPreview(null);
    setError("");
    if (!ticket.trim()) { setError("Vui lòng quét QR hoặc nhập mã vé."); return; }
    inFlight.current = true;
    setBusy(true);
    try {
      const data = await tournamentService.previewTicket(tournamentId, ticket.trim());
      if (request === generation.current) setPreview({ ticket: ticket.trim(), data });
    } catch (cause: any) {
      if (request === generation.current) setError(cause.response?.data?.message || "Không thể kiểm tra vé. Vui lòng thử lại.");
    } finally {
      if (request === generation.current) { inFlight.current = false; setBusy(false); }
    }
  }, [tournamentId]);

  const scanned = useCallback((ticket: string) => {
    setCamera(false);
    setCode(ticket);
    void check(ticket);
  }, [check]);
  const cameraError = useCallback(() => {
    setCamera(false);
    setError("Không mở được camera. Kiểm tra quyền camera/HTTPS hoặc nhập mã vé bên dưới.");
  }, []);

  const confirm = async () => {
    if (!preview || preview.ticket !== code.trim() || inFlight.current || preview.data.checkedInAt) return;
    inFlight.current = true;
    const request = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const data = await tournamentService.checkInTicket(tournamentId, preview.ticket);
      if (request === generation.current) {
        setPreview({ ticket: preview.ticket, data });
        onCheckedIn();
      }
    } catch (cause: any) {
      if (request === generation.current) {
        setPreview(null);
        setError(cause.response?.data?.message || "Không thể điểm danh. Hãy kiểm tra vé lại.");
      }
    } finally {
      if (request === generation.current) { inFlight.current = false; setBusy(false); }
    }
  };

  const close = () => { generation.current++; setCamera(false); onClose(); };
  return (
    <Modal open title="Quét vé / Điểm danh cơ thủ" onCancel={close} footer={null} width={560}>
      <div className="space-y-4 py-3">
        <p className="text-sm text-text-secondary">Quét vé để kiểm tra. Chỉ điểm danh sau khi đối chiếu người xuất trình với thông tin đăng ký.</p>
        <Button variant="outline" leftIcon={camera ? <StopOutlined /> : <CameraOutlined />} disabled={busy}
          onClick={() => { generation.current++; setPreview(null); setCamera((value) => !value); setError(""); }}>
          {camera ? "Dừng camera" : "Mở camera quét QR"}
        </Button>
        {camera && <TicketCamera onScan={scanned} onError={cameraError} />}
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); if (!inFlight.current) void check(code); }}>
          <label htmlFor="tournament-ticket-code" className="block text-sm font-medium text-text-main">Mã vé dự phòng</label>
          <Input.TextArea id="tournament-ticket-code" rows={3} value={code} disabled={busy}
            placeholder="Dán mã vé được sao chép từ E-Pass của khách"
            onChange={(event) => { generation.current++; setCode(event.target.value); setPreview(null); setError(""); }} />
          <Button htmlType="submit" variant="outline" loading={busy} disabled={camera}>Kiểm tra vé</Button>
        </form>
        {error && <div role="alert"><Alert type="error" showIcon title={error} /></div>}
        {preview && (
          <section aria-live="polite" className="space-y-3 rounded-xl border border-border-standard bg-bg-app p-4">
            <div>
              <h3 className="text-base font-semibold text-text-main">{preview.data.athleteName}</h3>
              <p className="text-sm text-text-secondary">{preview.data.athletePhone || "Chưa có SĐT"}</p>
              <p className="text-sm text-text-secondary">{preview.data.tournamentName}</p>
            </div>
            {preview.data.checkedInAt ? (
              <Alert type={preview.data.alreadyCheckedIn ? "warning" : "success"} showIcon
                title={preview.data.alreadyCheckedIn ? "Vé đã được điểm danh trước đó" : "Điểm danh thành công"}
                description={`Thời gian: ${new Date(preview.data.checkedInAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`} />
            ) : (
              <>
                <Alert type="success" showIcon title="Vé hợp lệ · Chưa điểm danh" />
                <Button variant="primary" leftIcon={<CheckOutlined />} loading={busy} onClick={() => void confirm()}>Xác nhận điểm danh</Button>
              </>
            )}
          </section>
        )}
        <div className="flex justify-end"><Button variant="outline" onClick={close}>Đóng</Button></div>
      </div>
    </Modal>
  );
}
