import { useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface InterviewSchedule {
    date: string;
    timeStart: string;
    duration: string;
    location: string;
    locationType: "offline" | "online";
    meetingLink: string;
    interviewerName: string;
    interviewerRole: string;
    notes: string;
    candidateName: string;
    position: string;
}

interface InterviewSchedulerPatchProps {
    /** Callback when user clicks "Chèn vào email" — provides HTML block */
    onInsertHtml?: (html: string) => void;
    /** Prefill candidate name */
    candidateName?: string;
    /** Prefill position */
    position?: string;
    /** Callback on close/cancel */
    onClose?: () => void;
}

// ── CSS ──────────────────────────────────────────────────────────────────────
const SCHEDULER_CSS = `
  .isp-container {
    font-family: 'DM Sans', 'Inter', sans-serif;
    background: var(--bg-card, #1e2235);
    border: 1px solid var(--border, #2d3154);
    border-radius: 14px;
    overflow: hidden;
    animation: isp-slideIn 0.25s ease;
  }

  @keyframes isp-slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .isp-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border, #2d3154);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-secondary, #1a1d2e);
  }

  .isp-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .isp-header-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1, #7c3aed);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 4px 16px rgba(99,102,241,0.3);
  }

  .isp-header-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary, #e8eaf6);
  }

  .isp-header-sub {
    font-size: 11px;
    color: var(--text-secondary, #8b92b8);
    margin-top: 1px;
  }

  .isp-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border, #2d3154);
    background: transparent;
    color: var(--text-secondary, #8b92b8);
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  .isp-close-btn:hover {
    border-color: var(--error, #ef4444);
    color: var(--error, #ef4444);
    background: rgba(239,68,68,0.08);
  }

  .isp-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }

  @media (max-width: 768px) {
    .isp-body { grid-template-columns: 1fr; }
  }

  /* ── FORM PANEL ── */
  .isp-form {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    border-right: 1px solid var(--border, #2d3154);
  }

  @media (max-width: 768px) {
    .isp-form { border-right: none; border-bottom: 1px solid var(--border, #2d3154); }
  }

  .isp-form-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .isp-section-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent-light, #818cf8);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .isp-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .isp-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .isp-field.full {
    grid-column: span 2;
  }

  .isp-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary, #8b92b8);
  }

  .isp-input, .isp-select, .isp-textarea {
    background: var(--bg-secondary, #1a1d2e);
    border: 1px solid var(--border, #2d3154);
    border-radius: 8px;
    color: var(--text-primary, #e8eaf6);
    font-size: 13px;
    font-family: inherit;
    padding: 8px 10px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
  }
  .isp-input:focus, .isp-select:focus, .isp-textarea:focus {
    border-color: var(--accent, #6366f1);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
  }

  .isp-textarea {
    min-height: 60px;
    resize: vertical;
    line-height: 1.5;
  }

  .isp-select {
    cursor: pointer;
  }
  .isp-select option {
    background: var(--bg-secondary, #1a1d2e);
  }

  .isp-radio-group {
    display: flex;
    gap: 4px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border, #2d3154);
  }

  .isp-radio-btn {
    flex: 1;
    padding: 7px 0;
    border: none;
    background: var(--bg-secondary, #1a1d2e);
    color: var(--text-secondary, #8b92b8);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    text-align: center;
  }
  .isp-radio-btn.active {
    background: linear-gradient(135deg, #6366f1, #7c3aed);
    color: #fff;
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }

  /* ── PREVIEW PANEL ── */
  .isp-preview {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--bg-primary, #0f1117);
  }

  .isp-preview-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary, #8b92b8);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .isp-preview-card {
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35);
    flex: 1;
    min-height: 200px;
  }

  .isp-preview-content {
    padding: 16px;
    font-family: -apple-system, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #222;
    line-height: 1.65;
  }

  /* ── FOOTER ── */
  .isp-footer {
    padding: 14px 20px;
    border-top: 1px solid var(--border, #2d3154);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: var(--bg-secondary, #1a1d2e);
  }

  .isp-footer-hint {
    font-size: 11px;
    color: var(--text-secondary, #8b92b8);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .isp-footer-actions {
    display: flex;
    gap: 8px;
  }

  .isp-btn-insert {
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #6366f1, #7c3aed);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s;
    font-family: inherit;
    box-shadow: 0 0 16px rgba(99,102,241,0.25);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .isp-btn-insert:hover {
    box-shadow: 0 0 22px rgba(99,102,241,0.45);
    transform: translateY(-1px);
  }
  .isp-btn-insert:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .isp-btn-copy {
    padding: 8px 14px;
    border: 1px solid var(--border, #2d3154);
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary, #8b92b8);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .isp-btn-copy:hover {
    border-color: var(--accent, #6366f1);
    color: var(--accent-light, #818cf8);
  }
  .isp-btn-copy.copied {
    border-color: var(--success, #10b981);
    color: var(--success, #10b981);
  }

  .isp-inserted-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(16,185,129,0.12);
    border: 1px solid rgba(16,185,129,0.3);
    border-radius: 8px;
    color: var(--success, #10b981);
    font-size: 12px;
    font-weight: 500;
    animation: isp-fadeIn 0.3s ease;
  }

  @keyframes isp-fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

// ── Generate Interview HTML Block ─────────────────────────────────────────────
function generateInterviewHtml(schedule: InterviewSchedule): string {
    const dateObj = schedule.date ? new Date(schedule.date + "T00:00:00") : null;
    const dateStr = dateObj
        ? dateObj.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "Chưa chọn ngày";

    const locationIcon = schedule.locationType === "online" ? "💻" : "📍";
    const locationLabel = schedule.locationType === "online" ? "Hình thức: Online" : "Địa điểm:";
    const locationValue = schedule.locationType === "online"
        ? `<a href="${schedule.meetingLink || '#'}" style="color:#1a73e8;text-decoration:none;font-weight:600;">${schedule.meetingLink || 'Link meeting'}</a>`
        : `<span style="font-weight:500;">${schedule.location || 'Chưa có địa điểm'}</span>`;

    return `
<div style="margin:16px 0;border-radius:12px;overflow:hidden;border:1px solid #e0e4ed;background:#ffffff;font-family:-apple-system,'Segoe UI',sans-serif;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:14px 18px;display:flex;align-items:center;gap:10px;">
    <span style="font-size:22px;">📅</span>
    <div>
      <div style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">Lịch phỏng vấn</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:1px;">Interview Invitation</div>
    </div>
  </div>
  <!-- Body -->
  <div style="padding:18px 20px;">
    ${schedule.candidateName ? `<div style="font-size:14px;color:#333;margin-bottom:12px;">Xin chào <strong>${schedule.candidateName}</strong>,</div>
    <div style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.6;">Chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn${schedule.position ? ` cho vị trí <strong>${schedule.position}</strong>` : ''} với thông tin chi tiết như sau:</div>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#555;width:140px;border-bottom:1px solid #f0f2f5;vertical-align:top;">📅 Ngày phỏng vấn</td>
        <td style="padding:10px 12px;color:#222;border-bottom:1px solid #f0f2f5;font-weight:500;">${dateStr}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#555;border-bottom:1px solid #f0f2f5;vertical-align:top;">🕐 Thời gian</td>
        <td style="padding:10px 12px;color:#222;border-bottom:1px solid #f0f2f5;font-weight:500;">${schedule.timeStart || '—'} ${schedule.duration ? `(${schedule.duration})` : ''}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-weight:600;color:#555;border-bottom:1px solid #f0f2f5;vertical-align:top;">${locationIcon} ${locationLabel}</td>
        <td style="padding:10px 12px;color:#222;border-bottom:1px solid #f0f2f5;">${locationValue}</td>
      </tr>
      ${schedule.interviewerName ? `<tr>
        <td style="padding:10px 12px;font-weight:600;color:#555;border-bottom:1px solid #f0f2f5;vertical-align:top;">👤 Người phỏng vấn</td>
        <td style="padding:10px 12px;color:#222;border-bottom:1px solid #f0f2f5;">
          <div style="font-weight:500;">${schedule.interviewerName}</div>
          ${schedule.interviewerRole ? `<div style="font-size:12px;color:#888;margin-top:2px;">${schedule.interviewerRole}</div>` : ''}
        </td>
      </tr>` : ''}
      ${schedule.notes ? `<tr>
        <td style="padding:10px 12px;font-weight:600;color:#555;vertical-align:top;">📝 Ghi chú</td>
        <td style="padding:10px 12px;color:#222;line-height:1.5;">${schedule.notes}</td>
      </tr>` : ''}
    </table>
  </div>
  <!-- Footer -->
  <div style="background:#f8f9fc;padding:12px 20px;border-top:1px solid #e0e4ed;font-size:12px;color:#888;display:flex;align-items:center;gap:6px;">
    <span>💡</span>
    <span>Vui lòng xác nhận tham dự bằng cách phản hồi email này. Nếu cần thay đổi lịch, hãy liên hệ với chúng tôi sớm nhất có thể.</span>
  </div>
</div>
<p></p>`;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function InterviewSchedulerPatch({
    onInsertHtml,
    candidateName = "",
    position = "",
    onClose,
}: InterviewSchedulerPatchProps) {
    const [schedule, setSchedule] = useState<InterviewSchedule>({
        date: "",
        timeStart: "09:00",
        duration: "30 phút",
        location: "Văn phòng LeadsMax Group, 84 Hồ Tùng Mậu, Đà Nẵng",
        locationType: "offline",
        meetingLink: "",
        interviewerName: "",
        interviewerRole: "",
        notes: "Vui lòng mang theo CMND/CCCD và CV bản cứng.",
        candidateName: candidateName,
        position: position,
    });

    const [inserted, setInserted] = useState(false);
    const [copied, setCopied] = useState(false);

    const updateField = useCallback((key: keyof InterviewSchedule, value: string) => {
        setSchedule((s) => ({ ...s, [key]: value }));
        setInserted(false);
    }, []);

    const html = generateInterviewHtml(schedule);

    const handleInsert = () => {
        if (onInsertHtml) {
            onInsertHtml(html);
            setInserted(true);
            setTimeout(() => setInserted(false), 3000);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(html).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const isValid = schedule.date && schedule.timeStart;

    return (
        <>
            <style>{SCHEDULER_CSS}</style>
            <div className="isp-container">
                {/* Header */}
                <div className="isp-header">
                    <div className="isp-header-left">
                        <div className="isp-header-icon">📅</div>
                        <div>
                            <div className="isp-header-title">Lịch phỏng vấn</div>
                            <div className="isp-header-sub">Tạo và chèn lịch phỏng vấn vào email</div>
                        </div>
                    </div>
                    {onClose && (
                        <button className="isp-close-btn" onClick={onClose} title="Đóng">✕</button>
                    )}
                </div>

                {/* Body: Form + Preview */}
                <div className="isp-body">
                    {/* Form */}
                    <div className="isp-form">
                        {/* Candidate info */}
                        <div className="isp-form-section">
                            <div className="isp-section-title">👤 Thông tin ứng viên</div>
                            <div className="isp-row">
                                <div className="isp-field">
                                    <span className="isp-label">Tên ứng viên</span>
                                    <input
                                        className="isp-input"
                                        value={schedule.candidateName}
                                        onChange={(e) => updateField("candidateName", e.target.value)}
                                        placeholder="Nguyễn Văn A"
                                    />
                                </div>
                                <div className="isp-field">
                                    <span className="isp-label">Vị trí ứng tuyển</span>
                                    <input
                                        className="isp-input"
                                        value={schedule.position}
                                        onChange={(e) => updateField("position", e.target.value)}
                                        placeholder="Frontend Developer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Schedule info */}
                        <div className="isp-form-section">
                            <div className="isp-section-title">📅 Thời gian & Địa điểm</div>
                            <div className="isp-row">
                                <div className="isp-field">
                                    <span className="isp-label">Ngày phỏng vấn *</span>
                                    <input
                                        className="isp-input"
                                        type="date"
                                        value={schedule.date}
                                        onChange={(e) => updateField("date", e.target.value)}
                                    />
                                </div>
                                <div className="isp-field">
                                    <span className="isp-label">Giờ bắt đầu *</span>
                                    <input
                                        className="isp-input"
                                        type="time"
                                        value={schedule.timeStart}
                                        onChange={(e) => updateField("timeStart", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="isp-row">
                                <div className="isp-field">
                                    <span className="isp-label">Thời lượng</span>
                                    <select
                                        className="isp-select"
                                        value={schedule.duration}
                                        onChange={(e) => updateField("duration", e.target.value)}
                                    >
                                        <option value="15 phút">15 phút</option>
                                        <option value="30 phút">30 phút</option>
                                        <option value="45 phút">45 phút</option>
                                        <option value="1 tiếng">1 tiếng</option>
                                        <option value="1.5 tiếng">1.5 tiếng</option>
                                        <option value="2 tiếng">2 tiếng</option>
                                    </select>
                                </div>
                                <div className="isp-field">
                                    <span className="isp-label">Hình thức</span>
                                    <div className="isp-radio-group">
                                        <button
                                            className={`isp-radio-btn ${schedule.locationType === "offline" ? "active" : ""}`}
                                            onClick={() => updateField("locationType", "offline")}
                                        >
                                            📍 Trực tiếp
                                        </button>
                                        <button
                                            className={`isp-radio-btn ${schedule.locationType === "online" ? "active" : ""}`}
                                            onClick={() => updateField("locationType", "online")}
                                        >
                                            💻 Online
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {schedule.locationType === "offline" ? (
                                <div className="isp-field">
                                    <span className="isp-label">Địa điểm</span>
                                    <input
                                        className="isp-input"
                                        value={schedule.location}
                                        onChange={(e) => updateField("location", e.target.value)}
                                        placeholder="Địa chỉ văn phòng"
                                    />
                                </div>
                            ) : (
                                <div className="isp-field">
                                    <span className="isp-label">Link meeting</span>
                                    <input
                                        className="isp-input"
                                        value={schedule.meetingLink}
                                        onChange={(e) => updateField("meetingLink", e.target.value)}
                                        placeholder="https://meet.google.com/..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Interviewer */}
                        <div className="isp-form-section">
                            <div className="isp-section-title">🎤 Người phỏng vấn</div>
                            <div className="isp-row">
                                <div className="isp-field">
                                    <span className="isp-label">Họ tên</span>
                                    <input
                                        className="isp-input"
                                        value={schedule.interviewerName}
                                        onChange={(e) => updateField("interviewerName", e.target.value)}
                                        placeholder="Nguyễn Thị B"
                                    />
                                </div>
                                <div className="isp-field">
                                    <span className="isp-label">Chức vụ</span>
                                    <input
                                        className="isp-input"
                                        value={schedule.interviewerRole}
                                        onChange={(e) => updateField("interviewerRole", e.target.value)}
                                        placeholder="HR Manager"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="isp-form-section">
                            <div className="isp-section-title">📝 Ghi chú</div>
                            <textarea
                                className="isp-textarea"
                                value={schedule.notes}
                                onChange={(e) => updateField("notes", e.target.value)}
                                placeholder="Ghi chú cho ứng viên..."
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="isp-preview">
                        <div className="isp-preview-title">👁 Xem trước trong email</div>
                        <div className="isp-preview-card">
                            <div
                                className="isp-preview-content"
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="isp-footer">
                    <div className="isp-footer-hint">
                        <span>💡</span>
                        <span>Chèn block lịch phỏng vấn vào vị trí hiện tại của con trỏ trong email</span>
                    </div>
                    <div className="isp-footer-actions">
                        {inserted && (
                            <div className="isp-inserted-badge">
                                ✅ Đã chèn thành công!
                            </div>
                        )}
                        <button
                            className={`isp-btn-copy ${copied ? "copied" : ""}`}
                            onClick={handleCopy}
                        >
                            {copied ? "✓ Đã copy" : "📋 Copy HTML"}
                        </button>
                        <button
                            className="isp-btn-insert"
                            onClick={handleInsert}
                            disabled={!isValid || !onInsertHtml}
                        >
                            📥 Chèn vào email
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// Export utilities
export { generateInterviewHtml };