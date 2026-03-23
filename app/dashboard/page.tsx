'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { GmailLabel, Template, Candidate, SendLogEntry, SendResult } from '@/types'
import { applyTemplate } from '@/lib/template'
import EmailComposer from '@/app/component/Emailcomposer'

// ─── Fallback signature (same as API) ────────────────────────────────────────
const DEFAULT_SIGNATURE = `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333">
  <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-right:14px;vertical-align:middle">
        <img src="https://i.imgur.com/mau8egI.jpeg" width="90" alt="Leadsmax" style="display:block"/>
      </td>
      <td style="border-left:2px solid #e5400a;padding-left:14px;vertical-align:middle">
        <div style="font-weight:700;color:#1a1a1a;font-size:14px">Human Resources</div>
        <div style="color:#555;margin-top:3px">(+84) 372 571 498</div>
        <div><a href="https://leadsmaxgroup.com" style="color:#e5400a;text-decoration:none">leadsmaxgroup.com</a></div>
        <div style="color:#888;font-size:12px;margin-top:2px">84 Ho Tung Mau, Hoa Minh, Lien Chieu, Da Nang, Vietnam</div>
      </td>
    </tr>
  </table>
</div>`

// ─── helper: readable label name ─────────────────────────────────────────────
function labelDisplay(name: string) {
  return name.replace(/^Label_\d+$/, 'Label không tên') || name
}

// ─── Toggle Switch component ─────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          background: checked ? 'var(--accent, #6366f1)' : 'var(--border, #d1d5db)',
          transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      {label && <span style={{ color: 'var(--text-secondary)' }}>{label}</span>}
    </label>
  )
}

// ─── Sub-component: Spinner ───────────────────────────────────────────────────
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span className="spinner" style={{ width: size, height: size, flexShrink: 0 }} />
  )
}

// ─── Sub-component: Edit Modal with EmailComposer ─────────────────────────────
interface EditItem {
  idx: number
  name: string
  email: string
  subject: string
  body: string
  useSignature: boolean
}
function EditModal({
  item,
  onSave,
  onClose,
}: {
  item: EditItem
  onSave: (idx: number, subject: string, body: string, useSignature: boolean) => void
  onClose: () => void
}) {
  const [useSignature, setUseSignature] = useState(item.useSignature)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 1100 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>✏️ Chỉnh sửa email</h3>
            <p className="text-muted text-sm mt-1">
              {item.name} &lt;{item.email}&gt;
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Toggle checked={useSignature} onChange={setUseSignature} label="Đính kèm chữ ký" />
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body" style={{ padding: '14px 20px' }}>
          <div style={{ height: 'auto' }}>
            <EmailComposer
              mode="edit"
              initialBody={item.body}
              initialSubject={item.subject}
              initialTo={`${item.name} <${item.email}>`}
              showPreview={true}
              showFields={true}
              height="100%"
              onSave={(data) => {
                onSave(item.idx, data.subject, data.bodyHtml, useSignature)
                onClose()
              }}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Template Manager ───────────────────────────────────────────────────
function TemplateTab({ labels }: { labels: GmailLabel[] }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    labelId: '',
    labelName: '',
    subject: '',
    body: '',
    useSignature: true,
  })
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/templates')
    const data = await res.json()
    setTemplates(data.templates ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  const handleLabelChange = (labelId: string) => {
    const lbl = labels.find((l) => l.id === labelId)
    setForm((f) => ({ ...f, labelId, labelName: lbl?.name ?? '' }))
  }

  const handleSave = async () => {
    if (!form.labelId || !form.subject || !form.body) {
      setMsg({ type: 'err', text: 'Vui lòng điền đầy đủ thông tin.' })
      return
    }
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setMsg({ type: 'ok', text: 'Lưu template thành công!' })
      setForm({ labelId: '', labelName: '', subject: '', body: '', useSignature: true })
      setShowForm(false)
      await loadTemplates()
    } else {
      const err = await res.json()
      setMsg({ type: 'err', text: err.error ?? 'Lỗi khi lưu.' })
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa template này?')) return
    setDeletingId(id)
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
    await loadTemplates()
    setDeletingId(null)
  }

  const handleEdit = (t: Template) => {
    setForm({
      labelId: t.labelId,
      labelName: t.labelName,
      subject: t.subject,
      body: t.body,
      useSignature: t.useSignature,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelForm = () => {
    setForm({ labelId: '', labelName: '', subject: '', body: '', useSignature: true })
    setShowForm(false)
    setMsg(null)
  }

  const isEditing = form.labelId && templates.some((t) => t.labelId === form.labelId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>📄 Quản lý Template</h3>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Tạo và quản lý template email cho từng label Gmail
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            ➕ Tạo template mới
          </button>
        )}
      </div>

      {/* Messages */}
      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: msg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'ok' ? 'var(--success)' : 'var(--error)', fontSize: 13,
        }}>
          {msg.text}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>
              {isEditing ? '✏️ Sửa template' : '➕ Tạo template mới'}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={handleCancelForm}>✕ Đóng</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="label">Gmail Label *</label>
              <select className="select" value={form.labelId} onChange={(e) => handleLabelChange(e.target.value)}>
                <option value="">-- Chọn label --</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>{labelDisplay(l.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tiêu đề email *</label>
              <input
                className="input"
                placeholder="Kết quả ứng tuyển - {{name}}"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
          </div>

          {/* Signature toggle */}
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <Toggle
              checked={form.useSignature}
              onChange={(v) => setForm((f) => ({ ...f, useSignature: v }))}
              label="Tự động thêm chữ ký khi gửi email"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">
              Nội dung email *{' '}
              <span className="text-muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
                — dùng <code style={{ color: 'var(--accent-light)', background: 'rgba(99,102,241,0.1)', padding: '1px 5px', borderRadius: 4 }}>{'{{name}}'}</code> để chèn tên
              </span>
            </label>
            <div style={{ height: 'auto' }}>
              <EmailComposer
                mode="template"
                initialBody={form.body}
                initialSubject={form.subject}
                showPreview={true}
                showFields={false}
                height="100%"
                onChange={(data) => {
                  setForm((f) => ({ ...f, body: data.bodyHtml }))
                }}
                onSave={(data) => {
                  setForm((f) => ({ ...f, body: data.bodyHtml }))
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
              {saving && <Spinner />}
              {saving ? 'Đang lưu...' : 'Lưu template'}
            </button>
            <button className="btn btn-secondary" onClick={handleCancelForm}>Hủy</button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={24} /></div>
        ) : templates.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📄</div>
            <div className="empty-text">Chưa có template nào. Tạo template đầu tiên ở trên.</div>
          </div>
        ) : (
          <div className="template-grid">
            {templates.map((t) => (
              <div key={t.id} className="template-card">
                <div className="template-card-header">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="badge badge-info">{labelDisplay(t.labelName)}</span>
                    {t.useSignature && (
                      <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', fontSize: 10 }}>✍️ Chữ ký</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(t)} title="Sửa">✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} title="Xóa">
                      {deletingId === t.id ? <Spinner size={12} /> : '🗑️'}
                    </button>
                  </div>
                </div>
                <h4 className="template-card-subject">{t.subject}</h4>
                <div
                  className="template-card-preview"
                  dangerouslySetInnerHTML={{ __html: t.body }}
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  style={{ maxHeight: expandedId === t.id ? 'none' : 80, cursor: 'pointer' }}
                />
                {expandedId !== t.id && t.body.length > 120 && (
                  <button className="template-card-expand" onClick={() => setExpandedId(t.id)}>Xem thêm ▾</button>
                )}
                {expandedId === t.id && (
                  <button className="template-card-expand" onClick={() => setExpandedId(null)}>Thu gọn ▴</button>
                )}
                <div className="template-card-footer">
                  <span className="text-muted text-xs">Cập nhật: {new Date(t.updatedAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Send Email ─────────────────────────────────────────────────────────
interface QueueItem {
  candidate: Candidate
  subject: string
  body: string
  selected: boolean
  useSignature: boolean
}

function SendTab({ labels }: { labels: GmailLabel[] }) {
  const [selectedLabel, setSelectedLabel] = useState('')
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [template, setTemplate] = useState<Template | null>(null)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [editItem, setEditItem] = useState<EditItem | null>(null)
  const [progress, setProgress] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)

  const loadCandidates = useCallback(async (labelId: string) => {
    if (!labelId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoadingCandidates(true)
    setResults([])
    setQueue([])
    setTemplate(null)

    try {
      const [tmplRes, candRes] = await Promise.all([
        fetch(`/api/templates?labelId=${encodeURIComponent(labelId)}`, { signal: controller.signal }),
        fetch(`/api/emails?labelId=${encodeURIComponent(labelId)}`, { signal: controller.signal }),
      ])
      const tmplData = await tmplRes.json()
      const candData = await candRes.json()

      const tmpl: Template | null = tmplData.template ?? null
      setTemplate(tmpl)

      const candidates: Candidate[] = candData.candidates ?? []
      const items: QueueItem[] = candidates.map((c) => {
        const vars = { name: c.fromName || c.fromEmail }
        return {
          candidate: c,
          subject: tmpl ? applyTemplate(tmpl.subject, vars) : `Re: ${c.subject}`,
          body: tmpl ? applyTemplate(tmpl.body, vars) : '',
          selected: true,
          useSignature: tmpl?.useSignature ?? true,
        }
      })
      setQueue(items)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      console.error('loadCandidates error:', e)
    }
    setLoadingCandidates(false)
  }, [])

  const toggleSelect = (idx: number) => {
    setQueue((q) => q.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))
  }

  const toggleAll = () => {
    const allSelected = queue.every((i) => i.selected)
    setQueue((q) => q.map((item) => ({ ...item, selected: !allSelected })))
  }

  const toggleSignature = (idx: number) => {
    setQueue((q) => q.map((item, i) => i === idx ? { ...item, useSignature: !item.useSignature } : item))
  }

  const handleSend = async () => {
    const toSend = queue.filter((i) => i.selected)
    if (toSend.length === 0) return
    if (!confirm(`Gửi ${toSend.length} email?`)) return

    setSending(true)
    setResults([])
    setProgress(`Đang gửi 0/${toSend.length}...`)

    const items = toSend.map((i) => ({
      toEmail: i.candidate.fromEmail,
      toName: i.candidate.fromName,
      subject: i.subject,
      body: i.body,
      labelId: selectedLabel,
      threadId: i.candidate.threadId,
      useSignature: i.useSignature,
    }))

    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const data = await res.json()
    setResults(data.results ?? [])
    setProgress('')
    setSending(false)
  }

  const selectedCount = queue.filter((i) => i.selected).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Label picker */}
      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Gmail Label</label>
            <select
              className="select"
              value={selectedLabel}
              onChange={(e) => { setSelectedLabel(e.target.value); loadCandidates(e.target.value) }}
            >
              <option value="">-- Chọn label --</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>{labelDisplay(l.name)}</option>
              ))}
            </select>
          </div>
          {selectedLabel && (
            <button className="btn btn-secondary" onClick={() => loadCandidates(selectedLabel)} disabled={loadingCandidates}>
              {loadingCandidates ? <Spinner /> : '🔄'} Tải lại
            </button>
          )}
        </div>

        {selectedLabel && !template && !loadingCandidates && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8, fontSize: 13, color: 'var(--warning)',
          }}>
            ⚠️ Chưa có template cho label này. Email sẽ không có nội dung. Vui lòng tạo template trước.
          </div>
        )}
      </div>

      {/* Candidate table */}
      {loadingCandidates ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spinner size={28} />
          <p className="text-muted mt-2">Đang tải danh sách ứng viên...</p>
        </div>
      ) : queue.length > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selectedCount}/{queue.length} được chọn
              </span>
              <button className="btn btn-ghost btn-sm" onClick={toggleAll}>
                {queue.every((i) => i.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleSend} disabled={sending || selectedCount === 0}>
              {sending ? <Spinner /> : '📨'}
              {sending ? progress || 'Đang gửi...' : `Gửi ${selectedCount} email`}
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="checkbox" checked={queue.every((i) => i.selected)} onChange={toggleAll} />
                  </th>
                  <th>Ứng viên</th>
                  <th>Email</th>
                  <th>Tiêu đề sẽ gửi</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Chữ ký</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item, idx) => {
                  const result = results.find((r) => r.email === item.candidate.fromEmail)
                  return (
                    <tr key={idx} style={{ opacity: item.selected ? 1 : 0.5 }}>
                      <td>
                        <input type="checkbox" className="checkbox" checked={item.selected} onChange={() => toggleSelect(idx)} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.candidate.fromName}</div>
                        <div className="text-muted text-xs">{item.candidate.date}</div>
                      </td>
                      <td>
                        <span className="font-mono text-sm">{item.candidate.fromEmail}</span>
                      </td>
                      <td className="truncate" style={{ maxWidth: 240 }}>
                        {item.subject}
                        {result && (
                          <span className={`badge ${result.status === 'sent' ? 'badge-success' : 'badge-error'}`} style={{ marginLeft: 8 }}>
                            {result.status === 'sent' ? '✓ Đã gửi' : '✗ Lỗi'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Toggle checked={item.useSignature} onChange={() => toggleSignature(idx)} />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Chỉnh sửa nội dung"
                          onClick={() => setEditItem({
                            idx,
                            name: item.candidate.fromName,
                            email: item.candidate.fromEmail,
                            subject: item.subject,
                            body: item.body,
                            useSignature: item.useSignature,
                          })}
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Results summary */}
          {results.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className="badge badge-success">✓ Thành công: {results.filter((r) => r.status === 'sent').length}</span>
              <span className="badge badge-error">✗ Lỗi: {results.filter((r) => r.status === 'error').length}</span>
              {results.filter((r) => r.status === 'error').map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--error)', background: 'rgba(239,68,68,0.08)', padding: '4px 10px', borderRadius: 6 }}>
                  {r.email}: {r.error}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : selectedLabel && !loadingCandidates ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div className="empty-text">Không tìm thấy email nào trong label này.</div>
        </div>
      ) : null}

      {editItem && (
        <EditModal
          item={editItem}
          onSave={(idx, subject, body, useSignature) => {
            setQueue((q) => q.map((item, i) => i === idx ? { ...item, subject, body, useSignature } : item))
          }}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  )
}

// ─── Tab: Signature Editor ───────────────────────────────────────────────────
function SignatureTab() {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/signature')
      .then((r) => r.json())
      .then((d) => { setHtml(d.signature ?? DEFAULT_SIGNATURE); setLoading(false) })
      .catch(() => { setHtml(DEFAULT_SIGNATURE); setLoading(false) })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: html }),
      })
      if (res.ok) {
        setMsg({ type: 'ok', text: '✓ Lưu chữ ký thành công!' })
      } else {
        setMsg({ type: 'err', text: 'Lỗi khi lưu chữ ký.' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Lỗi kết nối server.' })
    }
    setSaving(false)
  }

  const handleReset = () => {
    if (confirm('Reset chữ ký về mặc định của công ty?')) {
      setHtml(DEFAULT_SIGNATURE)
      setMsg({ type: 'ok', text: 'Đã reset về mặc định. Bấm "Lưu chữ ký" để áp dụng.' })
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spinner size={24} />
        <p className="text-muted mt-2">Đang tải chữ ký...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>✍️ Chữ ký Email</h3>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Chỉnh sửa HTML chữ ký — sẽ tự động chèn vào cuối email khi gửi
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleReset}>
            🔄 Reset mặc định
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Spinner />}
            {saving ? 'Đang lưu...' : '💾 Lưu chữ ký'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: msg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'ok' ? 'var(--success)' : 'var(--error)', fontSize: 13,
        }}>
          {msg.text}
        </div>
      )}

      {/* Editor + Preview side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, minHeight: 400 }}>
        {/* HTML Editor */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)', fontSize: 12,
            fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            ✏️ HTML Editor
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            style={{
              flex: 1, border: 'none', resize: 'none', padding: 16,
              fontFamily: "'DM Mono', 'Fira Code', monospace", fontSize: 13,
              lineHeight: 1.6, background: 'var(--bg-primary)', color: 'var(--text-primary)',
              outline: 'none', minHeight: 350,
            }}
            placeholder="Nhập HTML chữ ký tại đây..."
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)', fontSize: 12,
            fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            👁 Xem trước
          </div>
          <div style={{ flex: 1, padding: 20, background: '#fff', overflow: 'auto' }}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Send Logs ──────────────────────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState<SendLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/logs')
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs ?? []); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Lịch sử gửi ({logs.length})</h3>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setLoading(true)
            fetch('/api/logs').then((r) => r.json()).then((d) => { setLogs(d.logs ?? []); setLoading(false) })
          }}
        >
          🔄 Tải lại
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner size={24} /></div>
      ) : logs.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div className="empty-text">Chưa có lịch sử gửi nào.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trạng thái</th>
                <th>Tên</th>
                <th>Email</th>
                <th>Tiêu đề</th>
                <th>Label</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    {log.status === 'sent' ? (
                      <span className="badge badge-success">✓ Thành công</span>
                    ) : (
                      <span className="badge badge-error" title={log.errorMsg ?? ''}>✗ Lỗi</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.toName}</td>
                  <td className="font-mono text-sm text-muted">{log.toEmail}</td>
                  <td className="truncate" style={{ maxWidth: 220 }}>{log.subject}</td>
                  <td><span className="badge badge-info text-xs">{log.labelId}</span></td>
                  <td className="text-muted text-sm">{new Date(log.sentAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'signature' | 'logs'>('send')
  const [labels, setLabels] = useState<GmailLabel[]>([])
  const [labelsLoading, setLabelsLoading] = useState(true)
  const [labelsError, setLabelsError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/labels')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLabelsError(d.error); setLabelsLoading(false); return }
        setLabels(d.labels ?? [])
        setLabelsLoading(false)
      })
      .catch((e) => { setLabelsError(e.message); setLabelsLoading(false) })
  }, [status])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  const user = session?.user

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <header style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>✉️</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>HR Email Tool</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.image && (
            <img src={user.image} alt={user.name ?? ''} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)' }} />
          )}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => signOut({ callbackUrl: '/login' })}>Đăng xuất</button>
        </div>
      </header>

      {/* Body */}
      <main style={{ flex: 1, padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Xin chào, {user?.name} 👋</h1>
          <p className="text-muted">Quản lý template và gửi email hàng loạt cho ứng viên từ Gmail của bạn.</p>
        </div>

        {/* Labels error */}
        {labelsError && (
          <div style={{
            padding: '12px 16px', marginBottom: 20,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, fontSize: 13, color: 'var(--error)',
          }}>
            ⚠️ Không thể tải Gmail labels: {labelsError}<br />
            Thử đăng xuất và đăng nhập lại để cấp quyền Gmail.
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <div className={`tab ${activeTab === 'send' ? 'active' : ''}`} onClick={() => setActiveTab('send')}>
            📨 Gửi Email
          </div>
          <div className={`tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
            📄 Quản lý Template
          </div>
          <div className={`tab ${activeTab === 'signature' ? 'active' : ''}`} onClick={() => setActiveTab('signature')}>
            ✍️ Chữ ký
          </div>
          <div className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            📋 Lịch sử gửi
          </div>
        </div>

        {/* Tab content */}
        {labelsLoading && activeTab !== 'logs' && activeTab !== 'signature' ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spinner size={28} />
            <p className="text-muted mt-2">Đang tải Gmail labels...</p>
          </div>
        ) : (
          <>
            {activeTab === 'send' && <SendTab labels={labels} />}
            {activeTab === 'templates' && <TemplateTab labels={labels} />}
            {activeTab === 'signature' && <SignatureTab />}
            {activeTab === 'logs' && <LogsTab />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '16px',
        borderTop: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-secondary)',
      }}>
        HR Email Tool — gửi từ Gmail của bạn, có delay 800ms giữa mỗi email
      </footer>
    </div>
  )
}
