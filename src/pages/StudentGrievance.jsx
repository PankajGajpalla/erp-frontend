import { useEffect, useState } from "react"
import { submitGrievanceAPI, getMyGrievancesAPI } from "../api"
import { PageHeader, Alert, EmptyState, LoadingState, SectionCard } from "../components/UI"

const STATUS_BADGE = {
  open:     "bg-yellow-100 text-yellow-700 border border-yellow-200",
  resolved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
}

function fmtDate(iso) {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) }
  catch { return iso }
}

export default function StudentGrievance() {
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")

  // form
  const [title, setTitle]       = useState("")
  const [desc, setDesc]         = useState("")
  const [submitting, setSubmit] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const res = await getMyGrievancesAPI()
      setGrievances(res.data.grievances || [])
    } catch {
      setError("Failed to load grievances.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !desc.trim()) return setError("Please fill in both fields.")
    try {
      setSubmit(true)
      setError("")
      await submitGrievanceAPI({ title: title.trim(), description: desc.trim() })
      setSuccess("Grievance submitted successfully!")
      setTitle("")
      setDesc("")
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit grievance.")
    } finally {
      setSubmit(false)
    }
  }

  const open     = grievances.filter(g => g.status === "open")
  const resolved = grievances.filter(g => g.status === "resolved")

  return (
    <main className="page-main space-y-6">
      <PageHeader
        title="My Grievances"
        subtitle="Submit a complaint or concern — our team will respond shortly"
        action={
          <button onClick={() => { setShowForm(v => !v); setError(""); setSuccess("") }}
            className="btn-primary">
            {showForm ? "✕ Cancel" : "+ New Grievance"}
          </button>
        }
      />

      {error   && <Alert type="error"   message={error}   onClose={() => setError("")} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess("")} />}

      {/* ── Submit Form ─────────────────────────────────── */}
      {showForm && (
        <SectionCard title="Submit a New Grievance">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Title</label>
              <input
                className="inp"
                placeholder="e.g. Fee receipt not received"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                className="inp min-h-[120px] resize-y"
                placeholder="Describe your issue in detail..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Submitting…" : "Submit Grievance"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* ── List ────────────────────────────────────────── */}
      {loading ? <LoadingState /> : grievances.length === 0 ? (
        <EmptyState icon="📬" title="No grievances yet"
          subtitle="If you have a complaint or concern, click 'New Grievance' to submit one." />
      ) : (
        <div className="space-y-4">
          {/* Open */}
          {open.length > 0 && (
            <SectionCard title={`Open (${open.length})`}>
              <div className="space-y-4">
                {open.map(g => <GrievanceCard key={g.id} g={g} />)}
              </div>
            </SectionCard>
          )}
          {/* Resolved */}
          {resolved.length > 0 && (
            <SectionCard title={`Resolved (${resolved.length})`}>
              <div className="space-y-4">
                {resolved.map(g => <GrievanceCard key={g.id} g={g} />)}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </main>
  )
}

function GrievanceCard({ g }) {
  const [open, setOpen] = useState(false)

  function fmtDate(iso) {
    if (!iso) return "—"
    try { return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) }
    catch { return iso }
  }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 text-sm">{g.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{fmtDate(g.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[g.status]}`}>
            {g.status === "resolved" ? "✅ Resolved" : "🕐 Open"}
          </span>
          <span className="text-slate-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Your complaint</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{g.description}</p>
          </div>
          {g.reply ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
              <p className="text-xs font-medium text-emerald-700 mb-1">
                Reply from {g.replied_by} · {fmtDate(g.replied_at)}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{g.reply}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No reply yet — we will respond soon.</p>
          )}
        </div>
      )}
    </div>
  )
}
