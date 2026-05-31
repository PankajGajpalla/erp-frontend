import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { Alert, TabBar } from "../components/UI"
import {
  getInquiriesAPI, createInquiryAPI, updateInquiryAPI, deleteInquiryAPI,
  admitInquiryAPI, addFollowUpAPI, getPendingFollowUpsAPI, getInquiryStatsAPI,
  inquiryBulkSmsAPI, getCoursesAPI,
} from "../api"
import { useAuth } from "../context/AuthContext"

const MODE_LABELS    = { phone: "📞 Phone", walk_in: "🚶 Walk-in" }
const REMARKS_LABELS = { interested: "Interested", not_interested: "Not Interested", demo_requested: "Demo Requested", other: "Other" }
const STATUS_COLORS  = {
  inquiry:        "bg-blue-100 text-blue-700",
  admitted:       "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-700",
  interested:     "bg-emerald-100 text-emerald-700",
  demo_requested: "bg-purple-100 text-purple-700",
}
const STATUS_LABELS  = { inquiry: "Inquiry", admitted: "Admitted", not_interested: "Not Interested", interested: "Interested", demo_requested: "Demo Requested" }

function Badge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function Inquiry() {
  const [activeTab, setActiveTab] = useState("dashboard")
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <h2 className="text-xl font-bold text-slate-800 mb-5">📋 Inquiry Management</h2>
        <div className="mb-5">
          <TabBar
            tabs={[
              { key: "dashboard",  label: "📊 Dashboard" },
              { key: "all",        label: "📋 All Inquiries" },
              { key: "add",        label: "➕ Add Inquiry" },
              { key: "followups",  label: "🔔 Follow-ups Due" },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "all"       && <AllInquiries />}
        {activeTab === "add"       && <AddInquiry onSuccess={() => setActiveTab("all")} />}
        {activeTab === "followups" && <FollowUps />}
      </main>
    </div>
  )
}

// ─── Dashboard / Stats ────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInquiryStatsAPI()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-400 text-sm p-4">Loading stats…</div>
  if (!stats)  return <div className="text-red-500 text-sm p-4">Failed to load stats</div>

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Inquiries",   value: stats.total,          color: "border-blue-500",   text: "text-blue-600" },
          { label: "Admitted",          value: stats.admitted,        color: "border-green-500",  text: "text-green-600" },
          { label: "Conversion Rate",   value: `${stats.conversion_pct}%`, color: "border-purple-500", text: "text-purple-600" },
          { label: "Active / Pending",  value: stats.active,         color: "border-orange-500", text: "text-orange-600" },
        ].map(s => (
          <div key={s.label} className={`card p-5 border-l-4 ${s.color}`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* By Mode */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-4">By Mode of Inquiry</h3>
          <div className="space-y-3">
            {Object.entries(stats.by_mode).map(([mode, count]) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              return (
                <div key={mode}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{MODE_LABELS[mode] || mode}</span>
                    <span className="font-semibold text-slate-800">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(stats.by_mode).length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
          </div>
        </div>

        {/* By Course */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-4">By Course Interested</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(stats.by_course)
              .sort((a, b) => b[1] - a[1])
              .map(([course, count]) => (
                <div key={course} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-sm text-slate-700 truncate flex-1">{course}</span>
                  <span className="text-sm font-bold text-slate-800 ml-2 shrink-0">{count}</span>
                </div>
              ))}
            {Object.keys(stats.by_course).length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
          </div>
        </div>

        {/* By Month */}
        <div className="card p-5 md:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4">Monthly Inquiry Trend</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.by_month).map(([month, count]) => (
              <div key={month} className="text-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-2xl font-bold text-blue-600">{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{month}</p>
              </div>
            ))}
            {Object.keys(stats.by_month).length === 0 && <p className="text-slate-400 text-sm">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── All Inquiries Table ──────────────────────────────────────
function AllInquiries() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterMode, setFilterMode]     = useState("")
  const [filterCourse, setFilterCourse] = useState("")

  // Edit modal state
  const [editInq, setEditInq]     = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [saving, setSaving]       = useState(false)

  // Follow-up modal state
  const [fupInq, setFupInq]       = useState(null)
  const [fupForm, setFupForm]     = useState({ date: new Date().toISOString().split("T")[0], notes: "", outcome: "", next_followup_date: "" })
  const [fupSaving, setFupSaving] = useState(false)

  // Detail view
  const [detailInq, setDetailInq] = useState(null)
  const [detailFups, setDetailFups] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [courses, setCourses] = useState([])

  useEffect(() => {
    load()
    getCoursesAPI().then(r => setCourses(r.data.courses || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t) }
  }, [success])

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (filterMode)   params.mode   = filterMode
      if (filterCourse) params.course = filterCourse
      const r = await getInquiriesAPI(params)
      setInquiries(r.data.inquiries || [])
    } catch { setError("Failed to load inquiries") }
    finally { setLoading(false) }
  }

  async function handleAdmit(id) {
    try {
      await admitInquiryAPI(id)
      setSuccess("Marked as admitted!")
      load()
    } catch { setError("Failed to mark as admitted") }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this inquiry?")) return
    try {
      await deleteInquiryAPI(id)
      setSuccess("Deleted!")
      load()
    } catch { setError("Delete failed") }
  }

  async function handleEditSave() {
    setSaving(true)
    try {
      await updateInquiryAPI(editInq.id, editForm)
      setSuccess("Updated!")
      setEditInq(null)
      load()
    } catch { setError("Update failed") }
    finally { setSaving(false) }
  }

  async function handleFupSave() {
    setFupSaving(true)
    try {
      const payload = { ...fupForm }
      if (!payload.next_followup_date) delete payload.next_followup_date
      await addFollowUpAPI(fupInq.id, payload)
      setSuccess("Follow-up added!")
      setFupInq(null)
      setFupForm({ date: new Date().toISOString().split("T")[0], notes: "", outcome: "", next_followup_date: "" })
      load()
    } catch { setError("Failed to add follow-up") }
    finally { setFupSaving(false) }
  }

  async function openDetail(inq) {
    setDetailInq(inq); setDetailFups([]); setDetailLoading(true)
    try {
      const r = await import("../api").then(m => m.getInquiryAPI(inq.id))
      setDetailFups(r.data.inquiry.follow_ups || [])
    } catch { /* silent */ }
    finally { setDetailLoading(false) }
  }

  const filtered = inquiries.filter(i => {
    if (filterStatus && i.status !== filterStatus) return false
    if (filterMode   && i.mode   !== filterMode)   return false
    if (filterCourse && i.course_interested !== filterCourse) return false
    return true
  })

  return (
    <div className="space-y-4">
      {error   && <Alert type="error"   message={error}   onClose={() => setError("")} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess("")} />}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="inp w-auto bg-white">
          <option value="">All Status</option>
          <option value="inquiry">Inquiry</option>
          <option value="interested">Interested</option>
          <option value="demo_requested">Demo Requested</option>
          <option value="admitted">Admitted</option>
          <option value="not_interested">Not Interested</option>
        </select>
        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="inp w-auto bg-white">
          <option value="">All Modes</option>
          <option value="phone">📞 Phone</option>
          <option value="walk_in">🚶 Walk-in</option>
        </select>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="inp w-auto bg-white">
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <button onClick={load} className="btn-primary text-sm">Apply</button>
        {(filterStatus || filterMode || filterCourse) && (
          <button onClick={() => { setFilterStatus(""); setFilterMode(""); setFilterCourse(""); }} className="btn-ghost text-sm">Clear</button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} inquiries</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No inquiries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[900px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Phone</th>
                  <th>Mode</th>
                  <th>Attended By</th>
                  <th>Remarks</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inq => (
                  <tr key={inq.id} className="hover:bg-slate-50 transition">
                    <td className="text-xs text-slate-500 whitespace-nowrap">{inq.date}</td>
                    <td>
                      <p className="font-medium text-slate-800">{inq.student_name}</p>
                      {inq.referral_source && <p className="text-xs text-slate-400">Ref: {inq.referral_source}</p>}
                    </td>
                    <td className="text-sm text-slate-600">{inq.course_interested || "—"}</td>
                    <td>
                      <p className="text-xs text-slate-600">{inq.student_phone || "—"}</p>
                      {inq.parent_phone && <p className="text-xs text-slate-400">P: {inq.parent_phone}</p>}
                    </td>
                    <td><span className="text-sm">{MODE_LABELS[inq.mode] || inq.mode}</span></td>
                    <td className="text-sm text-slate-600">{inq.attended_by || "—"}</td>
                    <td>
                      <span className="text-xs text-slate-600">{REMARKS_LABELS[inq.remarks] || inq.remarks || "—"}</span>
                      {inq.negotiated_amount && <p className="text-xs text-green-600 font-medium">₹{inq.negotiated_amount.toLocaleString()}</p>}
                      {inq.custom_remark && <p className="text-xs text-slate-400 italic truncate max-w-[120px]">{inq.custom_remark}</p>}
                    </td>
                    <td><Badge status={inq.status} /></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => openDetail(inq)}
                          className="px-2 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition">View</button>
                        <button onClick={() => { setEditInq(inq); setEditForm({ ...inq }) }}
                          className="px-2 py-1 rounded text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 transition">Edit</button>
                        <button onClick={() => setFupInq(inq)}
                          className="px-2 py-1 rounded text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 transition">Follow-up</button>
                        {inq.status !== "admitted" && (
                          <button onClick={() => handleAdmit(inq.id)}
                            className="px-2 py-1 rounded text-xs bg-green-50 hover:bg-green-100 text-green-700 transition">Admit</button>
                        )}
                        <button onClick={() => handleDelete(inq.id)}
                          className="px-2 py-1 rounded text-xs bg-red-50 hover:bg-red-100 text-red-700 transition">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailInq && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailInq(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Inquiry — {detailInq.student_name}</h3>
              <button onClick={() => setDetailInq(null)} className="text-slate-400 hover:text-red-500 text-xl font-bold">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Date", detailInq.date],
                  ["Course", detailInq.course_interested || "—"],
                  ["Phone", detailInq.student_phone || "—"],
                  ["Parent Phone", detailInq.parent_phone || "—"],
                  ["Mode", MODE_LABELS[detailInq.mode] || detailInq.mode],
                  ["Attended By", detailInq.attended_by || "—"],
                  ["Negotiated Amount", detailInq.negotiated_amount ? `₹${detailInq.negotiated_amount.toLocaleString()}` : "—"],
                  ["Referral", detailInq.referral_source || "—"],
                  ["Remarks", REMARKS_LABELS[detailInq.remarks] || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{k}</p>
                    <p className="font-medium text-slate-700">{v}</p>
                  </div>
                ))}
              </div>
              {detailInq.custom_remark && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Comment</p>
                  <p className="text-sm text-slate-700">{detailInq.custom_remark}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                <Badge status={detailInq.status} />
                {detailInq.admission_date && <span className="text-xs text-green-600">· Admitted on {detailInq.admission_date}</span>}
              </div>

              {/* Follow-ups */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Follow-ups ({detailFups.length})</p>
                {detailLoading ? (
                  <p className="text-xs text-slate-400">Loading…</p>
                ) : detailFups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No follow-ups yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detailFups.map(f => (
                      <div key={f.id} className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-slate-700">{f.date}</span>
                          {f.outcome && <span className="text-purple-600 capitalize">{f.outcome.replace("_", " ")}</span>}
                        </div>
                        {f.notes && <p className="text-slate-600 mt-1">{f.notes}</p>}
                        {f.next_followup_date && <p className="text-orange-500 mt-1">Next follow-up: {f.next_followup_date}</p>}
                        <p className="text-slate-400 mt-1">By: {f.created_by}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editInq && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditInq(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Edit Inquiry</h3>
              <button onClick={() => setEditInq(null)} className="text-slate-400 hover:text-red-500 text-xl font-bold">×</button>
            </div>
            <div className="p-5 space-y-3">
              <InquiryFormFields form={editForm} setForm={setEditForm} courses={courses} />
              <div className="flex gap-2 pt-2">
                <button onClick={handleEditSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditInq(null)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {fupInq && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setFupInq(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Add Follow-up — {fupInq.student_name}</h3>
              <button onClick={() => setFupInq(null)} className="text-slate-400 hover:text-red-500 text-xl font-bold">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="form-label">Follow-up Date *</label>
                <input type="date" value={fupForm.date} onChange={e => setFupForm(f => ({ ...f, date: e.target.value }))} className="inp" />
              </div>
              <div>
                <label className="form-label">Outcome</label>
                <select value={fupForm.outcome} onChange={e => setFupForm(f => ({ ...f, outcome: e.target.value }))} className="inp">
                  <option value="">Select outcome</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="demo_scheduled">Demo Scheduled</option>
                  <option value="call_back">Will Call Back</option>
                </select>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea value={fupForm.notes} onChange={e => setFupForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="What was discussed…" rows={3} className="inp" />
              </div>
              <div>
                <label className="form-label">Next Follow-up Date (optional)</label>
                <input type="date" value={fupForm.next_followup_date} onChange={e => setFupForm(f => ({ ...f, next_followup_date: e.target.value }))} className="inp" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleFupSave} disabled={fupSaving} className="btn-primary flex-1">
                  {fupSaving ? "Saving…" : "Save Follow-up"}
                </button>
                <button onClick={() => setFupInq(null)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Inquiry Form ─────────────────────────────────────────
function AddInquiry({ onSuccess }) {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({
    date: today, student_name: "", course_interested: "", student_phone: "",
    parent_phone: "", mode: "walk_in", attended_by: user?.sub || "",
    negotiated_amount: "", referral_source: "", remarks: "interested", custom_remark: "", status: "inquiry",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    getCoursesAPI().then(r => setCourses(r.data.courses || [])).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault(); setError("")
    if (!form.student_name.trim()) { setError("Student name is required"); return }
    if (!form.mode)                { setError("Mode is required"); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.negotiated_amount) payload.negotiated_amount = parseFloat(payload.negotiated_amount)
      else delete payload.negotiated_amount
      if (!payload.referral_source) delete payload.referral_source
      if (!payload.custom_remark)   delete payload.custom_remark
      if (!payload.course_interested) delete payload.course_interested
      await createInquiryAPI(payload)
      setSuccess("Inquiry saved successfully!")
      setForm({ date: today, student_name: "", course_interested: "", student_phone: "",
        parent_phone: "", mode: "walk_in", attended_by: user?.sub || "",
        negotiated_amount: "", referral_source: "", remarks: "interested", custom_remark: "", status: "inquiry" })
      setTimeout(() => onSuccess?.(), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save inquiry")
    } finally { setSaving(false) }
  }

  return (
    <div className="card p-6 max-w-3xl">
      <h3 className="section-title mb-5">New Student Inquiry</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InquiryFormFields form={form} setForm={setForm} courses={courses} />
        {error   && <Alert type="error"   message={error}   onClose={() => setError("")} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess("")} />}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save Inquiry"}
          </button>
          <button type="button" onClick={() => setForm({ date: today, student_name: "", course_interested: "", student_phone: "",
            parent_phone: "", mode: "walk_in", attended_by: user?.sub || "",
            negotiated_amount: "", referral_source: "", remarks: "interested", custom_remark: "", status: "inquiry" })}
            className="btn-ghost">Reset</button>
        </div>
      </form>
    </div>
  )
}

// ─── Shared Form Fields ───────────────────────────────────────
function InquiryFormFields({ form, setForm, courses }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="form-label">Date of Inquiry *</label>
        <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="inp" />
      </div>
      <div>
        <label className="form-label">Student Name *</label>
        <input type="text" value={form.student_name} onChange={e => set("student_name", e.target.value)}
          placeholder="Full name" className="inp" />
      </div>
      <div>
        <label className="form-label">Course Interested In</label>
        <select value={form.course_interested} onChange={e => set("course_interested", e.target.value)} className="inp">
          <option value="">Select course</option>
          {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Mode of Inquiry *</label>
        <select value={form.mode} onChange={e => set("mode", e.target.value)} className="inp">
          <option value="walk_in">🚶 Walk-in Visit</option>
          <option value="phone">📞 Phone Call</option>
        </select>
      </div>
      <div>
        <label className="form-label">Student Phone</label>
        <input type="tel" value={form.student_phone} onChange={e => set("student_phone", e.target.value)}
          placeholder="10-digit mobile" className="inp" />
      </div>
      <div>
        <label className="form-label">Parent Phone</label>
        <input type="tel" value={form.parent_phone} onChange={e => set("parent_phone", e.target.value)}
          placeholder="10-digit mobile" className="inp" />
      </div>
      <div>
        <label className="form-label">Attended By (Staff)</label>
        <input type="text" value={form.attended_by} onChange={e => set("attended_by", e.target.value)}
          placeholder="Staff name" className="inp" />
      </div>
      <div>
        <label className="form-label">Referred By (if any)</label>
        <input type="text" value={form.referral_source} onChange={e => set("referral_source", e.target.value)}
          placeholder="Name of referral person" className="inp" />
      </div>
      <div>
        <label className="form-label">Negotiated Fees Amount (₹)</label>
        <input type="number" value={form.negotiated_amount} onChange={e => set("negotiated_amount", e.target.value)}
          placeholder="Final discussed amount" min="0" className="inp" />
      </div>
      <div>
        <label className="form-label">Student's Interest Level</label>
        <select value={form.remarks} onChange={e => set("remarks", e.target.value)} className="inp">
          <option value="interested">Interested</option>
          <option value="not_interested">Not Interested</option>
          <option value="demo_requested">Wants Demo Lecture</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="form-label">Status</label>
        <select value={form.status} onChange={e => set("status", e.target.value)} className="inp">
          <option value="inquiry">Inquiry</option>
          <option value="interested">Interested</option>
          <option value="demo_requested">Demo Requested</option>
          <option value="not_interested">Not Interested</option>
          <option value="admitted">Admitted</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="form-label">Additional Comments / Remarks</label>
        <textarea value={form.custom_remark} onChange={e => set("custom_remark", e.target.value)}
          placeholder="Any additional notes about this inquiry…" rows={2} className="inp" />
      </div>
    </div>
  )
}

// ─── Follow-ups Due ───────────────────────────────────────────
function FollowUps() {
  const [pending, setPending]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")
  const [selected, setSelected]     = useState(new Set())
  const [sending, setSending]       = useState(false)
  const [templateId, setTemplateId] = useState("")

  // Follow-up modal
  const [fupInq, setFupInq]   = useState(null)
  const [fupForm, setFupForm] = useState({ date: new Date().toISOString().split("T")[0], notes: "", outcome: "", next_followup_date: "" })
  const [fupSaving, setFupSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t) }
  }, [success])

  async function load() {
    setLoading(true)
    try {
      const r = await getPendingFollowUpsAPI()
      setPending(r.data.pending || [])
    } catch { setError("Failed to load pending follow-ups") }
    finally { setLoading(false) }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleAll() {
    if (selected.size === pending.length) setSelected(new Set())
    else setSelected(new Set(pending.map(i => i.id)))
  }

  async function handleBulkSMS() {
    if (selected.size === 0) { setError("Select at least one student"); return }
    setSending(true); setError("")
    try {
      const r = await inquiryBulkSmsAPI({ inquiry_ids: [...selected], template_id: templateId || undefined })
      setSuccess(`SMS sent to ${r.data.sent} numbers${r.data.failed > 0 ? `, ${r.data.failed} failed` : ""}`)
      setSelected(new Set())
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send SMS")
    } finally { setSending(false) }
  }

  async function handleFupSave() {
    setFupSaving(true)
    try {
      const payload = { ...fupForm }
      if (!payload.next_followup_date) delete payload.next_followup_date
      await addFollowUpAPI(fupInq.id, payload)
      setSuccess("Follow-up added!")
      setFupInq(null)
      setFupForm({ date: new Date().toISOString().split("T")[0], notes: "", outcome: "", next_followup_date: "" })
      load()
    } catch { setError("Failed to add follow-up") }
    finally { setFupSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error   && <Alert type="error"   message={error}   onClose={() => setError("")} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess("")} />}

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">Students Awaiting Follow-up</h3>
            <p className="text-xs text-slate-400 mt-0.5">No contact for 2+ days · not yet admitted or closed</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="text" value={templateId} onChange={e => setTemplateId(e.target.value)}
              placeholder="DLT Template ID (for SMS)" className="inp w-48 text-xs" />
            <button onClick={handleBulkSMS} disabled={sending || selected.size === 0}
              className="btn-primary text-sm disabled:opacity-50">
              {sending ? "Sending…" : `📱 Send SMS (${selected.size} selected)`}
            </button>
            <button onClick={load} className="btn-ghost text-sm">Refresh</button>
          </div>
        </div>
        {selected.size > 0 && (
          <p className="text-xs text-blue-600 mt-2">{selected.size} student{selected.size !== 1 ? "s" : ""} selected for bulk SMS</p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-6 text-slate-400 text-sm">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-slate-700">All caught up!</p>
          <p className="text-slate-400 text-sm mt-1">No pending follow-ups at the moment.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <input type="checkbox" checked={selected.size === pending.length} onChange={toggleAll}
              className="w-4 h-4 rounded" />
            <span className="text-xs text-slate-500">{pending.length} student{pending.length !== 1 ? "s" : ""} pending</span>
          </div>
          <div className="divide-y divide-slate-100">
            {pending.map(inq => (
              <div key={inq.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition ${selected.has(inq.id) ? "bg-blue-50/50" : ""}`}>
                <input type="checkbox" checked={selected.has(inq.id)} onChange={() => toggleSelect(inq.id)}
                  className="w-4 h-4 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{inq.student_name}</p>
                    <Badge status={inq.status} />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inq.days_since_contact >= 7 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                      {inq.days_since_contact}d ago
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>{inq.course_interested || "No course"}</span>
                    <span>·</span>
                    <span>{MODE_LABELS[inq.mode] || inq.mode}</span>
                    <span>·</span>
                    <span>Last contact: {inq.last_contact}</span>
                    {inq.student_phone && <><span>·</span><span>{inq.student_phone}</span></>}
                  </div>
                  {inq.custom_remark && <p className="text-xs text-slate-400 italic mt-0.5 truncate">{inq.custom_remark}</p>}
                </div>
                <button onClick={() => setFupInq(inq)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 transition">
                  + Follow-up
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {fupInq && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setFupInq(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Follow-up — {fupInq.student_name}</h3>
              <button onClick={() => setFupInq(null)} className="text-slate-400 hover:text-red-500 text-xl font-bold">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="form-label">Follow-up Date *</label>
                <input type="date" value={fupForm.date} onChange={e => setFupForm(f => ({ ...f, date: e.target.value }))} className="inp" />
              </div>
              <div>
                <label className="form-label">Outcome</label>
                <select value={fupForm.outcome} onChange={e => setFupForm(f => ({ ...f, outcome: e.target.value }))} className="inp">
                  <option value="">Select outcome</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="demo_scheduled">Demo Scheduled</option>
                  <option value="call_back">Will Call Back</option>
                </select>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea value={fupForm.notes} onChange={e => setFupForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="What was discussed…" rows={3} className="inp" />
              </div>
              <div>
                <label className="form-label">Next Follow-up Date (optional)</label>
                <input type="date" value={fupForm.next_followup_date} onChange={e => setFupForm(f => ({ ...f, next_followup_date: e.target.value }))} className="inp" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleFupSave} disabled={fupSaving} className="btn-primary flex-1">
                  {fupSaving ? "Saving…" : "Save Follow-up"}
                </button>
                <button onClick={() => setFupInq(null)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
