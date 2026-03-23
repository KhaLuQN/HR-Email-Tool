import { useState, useRef, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EmailComposerData {
    from: string;
    to: string;
    subject: string;
    bodyHtml: string;
}

export interface EmailComposerProps {
    initialFrom?: string;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
    mode?: "compose" | "edit" | "template";
    showPreview?: boolean;
    onSave?: (data: EmailComposerData) => void;
    onCancel?: () => void;
    height?: string;
    showFields?: boolean;
    insertHtmlRef?: React.MutableRefObject<((html: string) => void) | null>;
    onChange?: (data: { subject: string; bodyHtml: string }) => void;
}

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .ec-composer {
    display: grid;
    gap: 0;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
    background: var(--ec-bg2, #161b27);
    border-radius: 12px;
    border: 1px solid var(--ec-border, #2a3349);
  }
  .ec-composer.has-preview {
    grid-template-columns: 1fr 420px;
  }
  .ec-composer.no-preview {
    grid-template-columns: 1fr;
  }

  .ec-editor-panel {
    display: flex;
    flex-direction: column;
    background: var(--ec-bg2, #161b27);
    overflow: hidden;
  }
  .ec-composer.has-preview .ec-editor-panel {
    border-right: 1px solid var(--ec-border, #2a3349);
  }

  .ec-editor-header {
    padding: 14px 18px;
    border-bottom: 1px solid var(--ec-border, #2a3349);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    gap: 10px;
  }

  .ec-editor-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ec-text2, #8b96b4);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .ec-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ec-save-btn {
    padding: 6px 16px;
    border-radius: 7px;
    border: none;
    background: linear-gradient(135deg, #4f8ef7, #7c5cfc);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 0 16px rgba(79,142,247,0.25);
  }
  .ec-save-btn:hover {
    box-shadow: 0 0 22px rgba(79,142,247,0.45);
    transform: translateY(-1px);
  }

  .ec-cancel-btn {
    padding: 6px 14px;
    border-radius: 7px;
    border: 1px solid var(--ec-border, #2a3349);
    background: transparent;
    color: var(--ec-text2, #8b96b4);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .ec-cancel-btn:hover {
    border-color: var(--ec-accent, #4f8ef7);
    color: var(--ec-accent, #4f8ef7);
  }

  .ec-toolbar {
    padding: 10px 14px;
    border-bottom: 1px solid var(--ec-border, #2a3349);
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .ec-toolbar-sep {
    width: 1px;
    height: 20px;
    background: var(--ec-border, #2a3349);
    margin: 0 4px;
    flex-shrink: 0;
  }

  .ec-tb-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--ec-text2, #8b96b4);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.12s;
    font-family: 'DM Sans', sans-serif;
    flex-shrink: 0;
  }
  .ec-tb-btn:hover { background: var(--ec-bg3, #1e2536); color: var(--ec-text, #e8edf8); }
  .ec-tb-btn.on { background: rgba(79,142,247,0.15); color: var(--ec-accent, #4f8ef7); }

  .ec-tb-select {
    height: 28px;
    border: 1px solid var(--ec-border, #2a3349);
    border-radius: 6px;
    background: var(--ec-bg3, #1e2536);
    color: var(--ec-text2, #8b96b4);
    font-size: 11px;
    padding: 0 6px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .ec-tb-color {
    width: 28px;
    height: 28px;
    border: 1px solid var(--ec-border, #2a3349);
    border-radius: 6px;
    background: none;
    padding: 2px;
    cursor: pointer;
    overflow: hidden;
  }
  .ec-tb-color input[type=color] {
    width: 100%;
    height: 100%;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
  }

  .ec-fields-area {
    padding: 10px 14px;
    border-bottom: 1px solid var(--ec-border, #2a3349);
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  .ec-field-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ec-field-label {
    width: 56px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ec-text3, #5a6482);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .ec-field-input {
    flex: 1;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--ec-text, #e8edf8);
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    padding: 0 8px;
    transition: all 0.15s;
  }
  .ec-field-input:focus {
    outline: none;
    border-color: var(--ec-accent, #4f8ef7);
    background: rgba(79,142,247,0.08);
  }

  .ec-content-area {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ec-content-editable {
    flex: 1;
    min-height: 180px;
    border: 1px solid var(--ec-border, #2a3349);
    border-radius: 10px;
    background: var(--ec-bg3, #1e2536);
    color: var(--ec-text, #e8edf8);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    line-height: 1.7;
    padding: 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .ec-content-editable:focus { border-color: var(--ec-accent, #4f8ef7); }
  .ec-content-editable:empty::before {
    content: attr(data-placeholder);
    color: var(--ec-text3, #5a6482);
    pointer-events: none;
  }

  .ec-preview-panel {
    display: flex;
    flex-direction: column;
    background: var(--ec-bg, #0f1117);
    overflow: hidden;
  }

  .ec-preview-header {
    padding: 14px 18px;
    border-bottom: 1px solid var(--ec-border, #2a3349);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .ec-preview-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ec-text2, #8b96b4);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .ec-copy-btn {
    padding: 5px 12px;
    border: 1px solid var(--ec-border, #2a3349);
    border-radius: 6px;
    background: none;
    color: var(--ec-text2, #8b96b4);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .ec-copy-btn:hover { border-color: var(--ec-accent, #4f8ef7); color: var(--ec-accent, #4f8ef7); }
  .ec-copy-btn.copied { border-color: var(--ec-success, #34d399); color: var(--ec-success, #34d399); }

  .ec-preview-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 18px;
  }

  .ec-email-card {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 40px rgba(0,0,0,0.4);
    min-height: 300px;
  }

  .ec-email-meta {
    padding: 14px 18px;
    background: #f8f9fc;
    border-bottom: 1px solid #e8ebf2;
    font-family: -apple-system, 'Segoe UI', sans-serif;
  }

  .ec-email-meta-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .ec-email-meta-row:last-child { margin-bottom: 0; }

  .ec-email-meta-key {
    color: #888;
    font-weight: 500;
    width: 32px;
    flex-shrink: 0;
  }

  .ec-email-meta-val {
    color: #111;
    font-weight: 400;
  }

  .ec-email-subject-bar {
    padding: 12px 18px;
    background: #fff;
    border-bottom: 1px solid #e8ebf2;
    font-family: -apple-system, 'Segoe UI', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #111;
  }

  .ec-email-body-wrap {
    padding: 18px 22px;
    font-family: -apple-system, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.75;
    color: #222;
    min-height: 120px;
  }

  .ec-composer ::-webkit-scrollbar { width: 6px; }
  .ec-composer ::-webkit-scrollbar-track { background: transparent; }
  .ec-composer ::-webkit-scrollbar-thumb { background: var(--ec-border, #2a3349); border-radius: 3px; }
`;

// ── TOOLBAR BUTTON ────────────────────────────────────────────────────────────
function TbBtn({ icon, title, cmd, arg, onExec, isOn }: {
    icon: React.ReactNode; title: string; cmd: string; arg?: string;
    onExec: (cmd: string, arg?: string) => void; isOn: boolean;
}) {
    return (
        <button
            className={`ec-tb-btn ${isOn ? "on" : ""}`}
            title={title}
            onMouseDown={(e) => {
                e.preventDefault();
                onExec(cmd, arg);
            }}
        >
            {icon}
        </button>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function EmailComposer({
    initialFrom = "hr@leadsmaxgroup.com",
    initialTo = "{{name}} <{{email}}>",
    initialSubject = "Kết quả ứng tuyển - {{name}}",
    initialBody = `<p>Xin chào <strong>{{name}}</strong>,</p>
<p>Cảm ơn bạn đã quan tâm và ứng tuyển vào vị trí tại <strong>LeadsMax Group</strong>.</p>
<p>Chúng tôi đã xem xét hồ sơ của bạn và rất vui được thông báo rằng bạn đã vượt qua vòng sàng lọc hồ sơ. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để sắp xếp buổi phỏng vấn.</p>
<p>Trân trọng,</p>`,
    mode = "compose",
    showPreview: showPreviewProp,
    onSave,
    onCancel,
    height = "100%",
    showFields: showFieldsProp,
    insertHtmlRef,
    onChange,
}: EmailComposerProps) {
    const shouldShowPreview = showPreviewProp ?? (mode === "compose");
    const shouldShowFields = showFieldsProp ?? (mode !== "template");

    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [subject, setSubject] = useState(initialSubject);
    const [bodyHtml, setBodyHtml] = useState(initialBody);
    const [copied, setCopied] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const isComposing = useRef(false);

    // Sync initial props when they change
    useEffect(() => { setFrom(initialFrom); }, [initialFrom]);
    useEffect(() => { setTo(initialTo); }, [initialTo]);
    useEffect(() => { setSubject(initialSubject); }, [initialSubject]);
    useEffect(() => {
        setBodyHtml(initialBody);
        if (editorRef.current) {
            editorRef.current.innerHTML = initialBody;
        }
    }, [initialBody]);

    // Expose insertHtml method via ref
    useEffect(() => {
        if (insertHtmlRef) {
            insertHtmlRef.current = (html: string) => {
                if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand("insertHTML", false, html);
                    setTimeout(() => {
                        if (editorRef.current) setBodyHtml(editorRef.current.innerHTML);
                    }, 10);
                }
            };
        }
    }, [insertHtmlRef]);

    // Sync contenteditable → state + fire onChange (skip during IME composition)
    const handleInput = useCallback(() => {
        if (isComposing.current) return;
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setBodyHtml(html);
            onChange?.({ subject, bodyHtml: html });
        }
    }, [onChange, subject]);

    const handleCompositionStart = useCallback(() => {
        isComposing.current = true;
    }, []);

    const handleCompositionEnd = useCallback(() => {
        isComposing.current = false;
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setBodyHtml(html);
            onChange?.({ subject, bodyHtml: html });
        }
    }, [onChange, subject]);

    // Sync state → contenteditable (only on mount)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== bodyHtml) {
            editorRef.current.innerHTML = bodyHtml;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const exec = useCallback((cmd: string, arg?: string) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, arg ?? undefined);
        setTimeout(() => {
            if (editorRef.current) setBodyHtml(editorRef.current.innerHTML);
        }, 10);
    }, []);

    const isActive = (cmd: string) => {
        try { return document.queryCommandState(cmd); } catch { return false; }
    };

    const insertLink = () => {
        const url = prompt("Nhập URL:");
        if (url) exec("createLink", url);
    };

    const insertTable = () => {
        const tbl = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead><tr style="background:#f0f4ff;"><th>Tiêu đề 1</th><th>Tiêu đề 2</th><th>Tiêu đề 3</th></tr></thead>
      <tbody><tr><td>Dữ liệu</td><td>Dữ liệu</td><td>Dữ liệu</td></tr></tbody>
    </table><p></p>`;
        exec("insertHTML", tbl);
    };

    const handleCopy = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(bodyHtml).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                fallbackCopy(bodyHtml);
            });
        } else {
            fallbackCopy(bodyHtml);
        }
    };

    const fallbackCopy = (text: string) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed:', e);
        }
        document.body.removeChild(textarea);
    };

    const handleSave = () => {
        if (onSave) {
            onSave({
                from,
                to,
                subject,
                bodyHtml,
            });
        }
    };

    const modeLabels = {
        compose: { title: "✉ Email Composer", save: "💾 Lưu & Gửi" },
        edit: { title: "✏️ Chỉnh sửa Email", save: "💾 Lưu thay đổi" },
        template: { title: "📄 Soạn Template", save: "💾 Lưu template" },
    };
    const mLabel = modeLabels[mode] || modeLabels.compose;

    return (
        <>
            <style>{CSS}</style>
            <div className={`ec-composer ${shouldShowPreview ? "has-preview" : "no-preview"}`} style={{ height }}>
                {/* ── LEFT: EDITOR ── */}
                <div className="ec-editor-panel">
                    <div className="ec-editor-header">
                        <span className="ec-editor-title">{mLabel.title}</span>
                        <div className="ec-header-actions">
                            {onCancel && <button className="ec-cancel-btn" onClick={onCancel}>Hủy</button>}
                            {onSave && <button className="ec-save-btn" onClick={handleSave}>{mLabel.save}</button>}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="ec-toolbar">
                        <TbBtn icon={<b>B</b>} title="Bold" cmd="bold" onExec={exec} isOn={isActive("bold")} />
                        <TbBtn icon={<i>I</i>} title="Italic" cmd="italic" onExec={exec} isOn={isActive("italic")} />
                        <TbBtn icon={<u>U</u>} title="Underline" cmd="underline" onExec={exec} isOn={isActive("underline")} />
                        <TbBtn icon={<s>S</s>} title="Strikethrough" cmd="strikeThrough" onExec={exec} isOn={isActive("strikeThrough")} />

                        <span className="ec-toolbar-sep" />

                        <select className="ec-tb-select" onChange={(e) => exec("formatBlock", e.target.value)} defaultValue="">
                            <option value="" disabled>Đoạn văn</option>
                            <option value="p">Đoạn văn</option>
                            <option value="h1">Tiêu đề 1</option>
                            <option value="h2">Tiêu đề 2</option>
                            <option value="h3">Tiêu đề 3</option>
                            <option value="blockquote">Trích dẫn</option>
                            <option value="pre">Code block</option>
                        </select>

                        <select className="ec-tb-select" onChange={(e) => exec("fontSize", e.target.value)} defaultValue="3">
                            <option value="1">8pt</option>
                            <option value="2">10pt</option>
                            <option value="3">12pt</option>
                            <option value="4">14pt</option>
                            <option value="5">18pt</option>
                            <option value="6">24pt</option>
                            <option value="7">36pt</option>
                        </select>

                        <span className="ec-toolbar-sep" />

                        <TbBtn icon="≡" title="Căn trái" cmd="justifyLeft" onExec={exec} isOn={isActive("justifyLeft")} />
                        <TbBtn icon="≡" title="Căn giữa" cmd="justifyCenter" onExec={exec} isOn={isActive("justifyCenter")} />
                        <TbBtn icon="≡" title="Căn phải" cmd="justifyRight" onExec={exec} isOn={isActive("justifyRight")} />

                        <span className="ec-toolbar-sep" />

                        <TbBtn icon="• ≡" title="Danh sách không thứ tự" cmd="insertUnorderedList" onExec={exec} isOn={isActive("insertUnorderedList")} />
                        <TbBtn icon="1.≡" title="Danh sách có thứ tự" cmd="insertOrderedList" onExec={exec} isOn={isActive("insertOrderedList")} />

                        <span className="ec-toolbar-sep" />

                        <div className="ec-tb-color" title="Màu chữ">
                            <input type="color" defaultValue="#111111" onChange={(e) => exec("foreColor", e.target.value)} />
                        </div>
                        <div className="ec-tb-color" title="Màu nền chữ">
                            <input type="color" defaultValue="#ffff00" onChange={(e) => exec("hiliteColor", e.target.value)} />
                        </div>

                        <span className="ec-toolbar-sep" />

                        <button className="ec-tb-btn" title="Chèn liên kết" onMouseDown={(e) => { e.preventDefault(); insertLink(); }}>🔗</button>
                        <button className="ec-tb-btn" title="Chèn bảng" onMouseDown={(e) => { e.preventDefault(); insertTable(); }}>⊞</button>
                        <TbBtn icon="↩" title="Xóa định dạng" cmd="removeFormat" onExec={exec} isOn={false} />
                    </div>

                    {/* To / From / Subject */}
                    {shouldShowFields && (
                        <div className="ec-fields-area">
                            <div className="ec-field-row">
                                <span className="ec-field-label">Từ</span>
                                <input className="ec-field-input" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="sender@company.com" />
                            </div>
                            <div className="ec-field-row">
                                <span className="ec-field-label">Đến</span>
                                <input className="ec-field-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@example.com" />
                            </div>
                            <div className="ec-field-row">
                                <span className="ec-field-label">Tiêu đề</span>
                                <input className="ec-field-input" value={subject} onChange={(e) => { setSubject(e.target.value); onChange?.({ subject: e.target.value, bodyHtml }); }} placeholder="Tiêu đề email" style={{ fontWeight: 600 }} />
                            </div>
                        </div>
                    )}

                    {/* Content area */}
                    <div className="ec-content-area">
                        <div
                            ref={editorRef}
                            className="ec-content-editable"
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="Soạn nội dung email tại đây..."
                            onInput={handleInput}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={handleCompositionEnd}
                        />
                    </div>
                </div>

                {/* ── RIGHT: PREVIEW ── */}
                {shouldShowPreview && (
                    <div className="ec-preview-panel">
                        <div className="ec-preview-header">
                            <span className="ec-preview-title">👁 Xem trước</span>
                            <button className={`ec-copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy}>
                                {copied ? "✓ Đã copy HTML" : "Copy HTML"}
                            </button>
                        </div>

                        <div className="ec-preview-scroll">
                            <div className="ec-email-card">
                                {shouldShowFields && (
                                    <div className="ec-email-meta">
                                        <div className="ec-email-meta-row">
                                            <span className="ec-email-meta-key">Từ:</span>
                                            <span className="ec-email-meta-val">{from || "—"}</span>
                                        </div>
                                        <div className="ec-email-meta-row">
                                            <span className="ec-email-meta-key">Đến:</span>
                                            <span className="ec-email-meta-val">{to || "—"}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="ec-email-subject-bar">{subject || "(Không có tiêu đề)"}</div>
                                <div className="ec-email-body-wrap">
                                    <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}