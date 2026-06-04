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
              { key: "import",     label: "📥 Import Excel" },
              { key: "followups",  label: "🔔 Follow-ups Due" },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "all"       && <AllInquiries />}
        {activeTab === "add"       && <AddInquiry onSuccess={() => setActiveTab("all")} />}
        {activeTab === "import"    && <ImportInquiries onSuccess={() => setActiveTab("all")} />}
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

// ─── Import Inquiries from Excel ─────────────────────────────
function ImportInquiries({ onSuccess }) {
  const [rows, setRows]           = useState([])   // parsed + validated preview rows
  const [fileName, setFileName]   = useState("")
  const [dragOver, setDragOver]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState(null)  // { saved, failed, errors[] }
  const [parseError, setParseError] = useState("")

  // ── Column config ──
  // header label (lowercase match) → field key
  const COL_MAP = {
    "date":               "date",
    "student name":       "student_name",
    "name":               "student_name",
    "course":             "course_interested",
    "course interested":  "course_interested",
    "student phone":      "student_phone",
    "phone":              "student_phone",
    "mobile":             "student_phone",
    "parent phone":       "parent_phone",
    "father phone":       "parent_phone",
    "mode":               "mode",
    "attended by":        "attended_by",
    "staff":              "attended_by",
    "amount":             "negotiated_amount",
    "negotiated amount":  "negotiated_amount",
    "fees":               "negotiated_amount",
    "referral":           "referral_source",
    "referred by":        "referral_source",
    "referral source":    "referral_source",
    "remarks":            "remarks",
    "interest level":     "remarks",
    "status":             "status",
    "comment":            "custom_remark",
    "comments":           "custom_remark",
    "custom remark":      "custom_remark",
    "notes":              "custom_remark",
  }

  function normaliseMode(val) {
    if (!val) return "walk_in"
    const v = String(val).toLowerCase().trim()
    if (v.includes("phone") || v.includes("call")) return "phone"
    return "walk_in"
  }

  function normaliseRemarks(val) {
    if (!val) return "interested"
    const v = String(val).toLowerCase().trim()
    if (v.includes("not") || v.includes("uninterested")) return "not_interested"
    if (v.includes("demo")) return "demo_requested"
    if (v.includes("other")) return "other"
    return "interested"
  }

  function normaliseStatus(val) {
    if (!val) return "inquiry"
    const v = String(val).toLowerCase().trim()
    if (v.includes("admit")) return "admitted"
    if (v.includes("not") || v.includes("close")) return "not_interested"
    if (v.includes("demo")) return "demo_requested"
    if (v.includes("interest")) return "interested"
    return "inquiry"
  }

  function parseExcelDate(val) {
    if (!val) return new Date().toISOString().split("T")[0]
    // Excel serial number
    if (typeof val === "number") {
      const d = new Date(Math.round((val - 25569) * 864e5))
      return d.toISOString().split("T")[0]
    }
    const s = String(val).trim()
    // DD/MM/YYYY or DD-MM-YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3]
      return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`
    }
    // YYYY-MM-DD passthrough
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    return new Date().toISOString().split("T")[0]
  }

  function validateRow(row, idx) {
    const errs = []
    if (!row.student_name?.trim()) errs.push("Student Name required")
    if (!row.mode)                  errs.push("Mode required")
    return errs
  }

  async function parseFile(file) {
    setParseError(""); setRows([]); setResult(null)
    setFileName(file.name)
    try {
      const XLSX = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array", cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
      if (raw.length < 2) { setParseError("File is empty or has no data rows"); return }

      // First row = headers
      const headers = raw[0].map(h => String(h).toLowerCase().trim())
      const dataRows = raw.slice(1).filter(r => r.some(c => c !== ""))

      const parsed = dataRows.map((r, idx) => {
        const obj = {}
        headers.forEach((h, i) => {
          const field = COL_MAP[h]
          if (field) obj[field] = r[i]
        })

        const row = {
          _idx:              idx + 2,  // Excel row number
          date:              parseExcelDate(obj.date),
          student_name:      String(obj.student_name || "").trim(),
          course_interested: String(obj.course_interested || "").trim(),
          student_phone:     String(obj.student_phone || "").trim(),
          parent_phone:      String(obj.parent_phone  || "").trim(),
          mode:              normaliseMode(obj.mode),
          attended_by:       String(obj.attended_by || "").trim(),
          negotiated_amount: obj.negotiated_amount ? parseFloat(obj.negotiated_amount) || "" : "",
          referral_source:   String(obj.referral_source || "").trim(),
          remarks:           normaliseRemarks(obj.remarks),
          status:            normaliseStatus(obj.status),
          custom_remark:     String(obj.custom_remark || "").trim(),
        }
        row._errors = validateRow(row, idx)
        return row
      })

      if (parsed.length === 0) { setParseError("No data rows found after the header row"); return }
      setRows(parsed)
    } catch (e) {
      setParseError(`Failed to read file: ${e.message}`)
    }
  }

  function handleFileInput(e) {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) parseFile(f)
  }

  async function handleImport() {
    const valid = rows.filter(r => r._errors.length === 0)
    if (valid.length === 0) return
    setImporting(true); setProgress(0); setResult(null)
    let saved = 0, failed = 0
    const failedRows = []
    for (const row of valid) {
      const payload = {
        date:              row.date,
        student_name:      row.student_name,
        mode:              row.mode,
        course_interested: row.course_interested || undefined,
        student_phone:     row.student_phone     || undefined,
        parent_phone:      row.parent_phone      || undefined,
        attended_by:       row.attended_by       || undefined,
        negotiated_amount: row.negotiated_amount !== "" ? parseFloat(row.negotiated_amount) : undefined,
        referral_source:   row.referral_source   || undefined,
        remarks:           row.remarks           || undefined,
        status:            row.status            || "inquiry",
        custom_remark:     row.custom_remark     || undefined,
      }
      try {
        await createInquiryAPI(payload)
        saved++
      } catch {
        failed++
        failedRows.push(`Row ${row._idx} (${row.student_name})`)
      }
      setProgress(Math.round(((saved + failed) / valid.length) * 100))
    }
    setImporting(false)
    setResult({ saved, failed, failedRows })
    if (saved > 0) {
      setRows([])
      setFileName("")
    }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx")
    const headers = [
      "Date","Student Name","Course Interested","Student Phone","Parent Phone",
      "Mode","Attended By","Negotiated Amount","Referral Source","Remarks","Custom Remark","Status"
    ]
    const sample = [
      ["15/06/2025","Rahul Sharma","BCA","9876543210","9876543211","walk_in","Admin","15000","Friend","interested","Wants weekend batch","inquiry"],
      ["16/06/2025","Priya Patel","BBA","8765432109","","phone","Staff","","Google","demo_requested","","interested"],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample])
    // Column widths
    ws["!cols"] = headers.map((h, i) => ({ wch: [10,20,20,14,14,10,14,16,16,14,24,12][i] || 14 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Inquiries")
    XLSX.writeFile(wb, "inquiry_import_template.xlsx")
  }

  const validCount   = rows.filter(r => r._errors.length === 0).length
  const invalidCount = rows.filter(r => r._errors.length > 0).length

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header card */}
      <div className="card p-5 flex flex-wrap gap-4 items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-base">Import Inquiries from Excel</h3>
          <p className="text-sm text-slate-500 mt-1">
            Upload a <code className="bg-slate-100 px-1 rounded text-xs">.xlsx</code> or{" "}
            <code className="bg-slate-100 px-1 rounded text-xs">.xls</code> file.
            First row must be the header row.
          </p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 border border-green-500 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition">
          ⬇️ Download Template
        </button>
      </div>

      {/* Column reference */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Accepted Column Headers</p>
        <div className="flex flex-wrap gap-2">
          {["Date","Student Name","Course Interested","Student Phone","Parent Phone","Mode","Attended By",
            "Negotiated Amount","Referral Source","Remarks","Custom Remark","Status"].map(h => (
            <span key={h} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{h}</span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          <strong>Mode:</strong> "phone" or "walk_in" &nbsp;·&nbsp;
          <strong>Remarks:</strong> interested / not_interested / demo_requested / other &nbsp;·&nbsp;
          <strong>Date:</strong> DD/MM/YYYY or YYYY-MM-DD
        </p>
      </div>

      {/* Drop zone */}
      {rows.length === 0 && !parseError && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer
            ${dragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}
          onClick={() => document.getElementById("inq-excel-input").click()}
        >
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold text-slate-700">Drop your Excel file here</p>
          <p className="text-sm text-slate-400 mt-1">or click to browse</p>
          <input id="inq-excel-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
        </div>
      )}

      {/* Already have a file, show replace option */}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-600">📎 <strong>{fileName}</strong></span>
          <button
            onClick={() => { setRows([]); setFileName(""); setResult(null); document.getElementById("inq-excel-input2").click() }}
            className="text-xs text-blue-600 hover:underline">
            Replace file
          </button>
          <input id="inq-excel-input2" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700">Could not read file</p>
            <p className="text-sm text-red-600">{parseError}</p>
            <button onClick={() => { setParseError(""); document.getElementById("inq-excel-input").click() }}
              className="text-xs text-blue-600 hover:underline mt-2">Try another file</button>
          </div>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className={`rounded-xl p-4 border ${result.failed === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
          <p className={`font-semibold ${result.failed === 0 ? "text-green-700" : "text-orange-700"}`}>
            {result.failed === 0
              ? `✅ All ${result.saved} inquiries imported successfully!`
              : `⚠️ ${result.saved} imported · ${result.failed} failed`}
          </p>
          {result.failedRows.length > 0 && (
            <p className="text-xs text-orange-600 mt-1">{result.failedRows.join(", ")}</p>
          )}
          {result.saved > 0 && (
            <button onClick={() => onSuccess?.()} className="mt-2 text-sm text-blue-600 hover:underline">
              View All Inquiries →
            </button>
          )}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="card overflow-hidden">
          {/* Preview header */}
          <div className="p-4 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">Preview — {rows.length} rows found</p>
              <div className="flex gap-3 mt-1 text-xs">
                {validCount   > 0 && <span className="text-green-600 font-medium">✓ {validCount} valid</span>}
                {invalidCount > 0 && <span className="text-red-500 font-medium">✗ {invalidCount} with errors</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {importing ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Importing… {progress}%
                </div>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={validCount === 0}
                  className="btn-primary disabled:opacity-50">
                  📥 Import {validCount} Quer{validCount !== 1 ? "ies" : "y"}
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {importing && (
            <div className="h-1 bg-slate-100">
              <div className="h-1 bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Student Name</th>
                  <th className="px-3 py-2 text-left">Course</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-left">Mode</th>
                  <th className="px-3 py-2 text-left">Attended By</th>
                  <th className="px-3 py-2 text-left">Remarks</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Issues</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const hasError = row._errors.length > 0
                  return (
                    <tr key={i} className={`border-t ${hasError ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-3 py-2 text-slate-400">{row._idx}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {row.student_name || <span className="text-red-400 italic">Missing</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.course_interested || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <p>{row.student_phone || "—"}</p>
                        {row.parent_phone && <p className="text-slate-400">P: {row.parent_phone}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.mode === "phone" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {row.mode === "phone" ? "📞" : "🚶"} {row.mode}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.attended_by || "—"}</td>
                      <td className="px-3 py-2 text-slate-600 capitalize">{row.remarks?.replace("_", " ") || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          row.status === "admitted" ? "bg-green-100 text-green-700" :
                          row.status === "not_interested" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {hasError ? (
                          <span className="text-red-500 font-medium">{row._errors.join("; ")}</span>
                        ) : (
                          <span className="text-green-500">✓</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {invalidCount > 0 && (
            <div className="px-4 py-3 bg-red-50 border-t border-red-100 text-xs text-red-600">
              ⚠️ {invalidCount} row{invalidCount !== 1 ? "s" : ""} with errors will be skipped during import. Fix the file and re-upload to include them.
            </div>
          )}
        </div>
      )}
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
