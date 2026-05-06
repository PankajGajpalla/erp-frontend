import { useEffect, useState } from "react"
import {
  getAllGrievancesAPI, replyGrievanceAPI,
  resolveGrievanceAPI, reopenGrievanceAPI,
} from "../api"
import {
  PageHeader, Alert, EmptyState, LoadingState,
  SectionCard, TabBar, SearchBar,
} from "../components/UI"

const STATUS_BADGE = {
  open:     "bg-yellow-100 text-yellow-700 border border-yellow-200",
  resolved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
}

function fmtDate(iso) {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) }
  catch { return iso }
}

export default function GrievanceManagement() {
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")
  const [tab, setTab]               = useState("open")   // open | resolved | all
  const [search, setSearch]         = useState("")

  const load = async () => {
    try {
      setLoading(true)
      const res = await getAllGrievancesAPI()
      setGrievances(res.data.grievances || [])
    } catch {
      setError("Failed to load grievances.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = grievances
    .filter(g => tab === "all" ? true : g.status === tab)
    .filter(g => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        g.title?.toLowerCase().includes(q) ||
        g.student_name?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
      )
    })

  const openCount     = grievances.filter(g => g.status === "open").length
  const resolvedCount = grievances.filter(g => g.status === "resolved").length

  return (
    <main className="page-main space-y-6">
      <PageHeader
        title="Grievances"
        subtitle="View and respond to student complaints"
      />

      {error   && <Alert type="error"   message={error}   onClose={() => setError("")} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess("")} />}

      {/* ── Stats row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-yellow-400">
          <p className="text-xs text-slate-500 font-medium">Open</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{openCount}</p>
        </div>
        <div className="card p-4 border-l-4 border-emerald-400">
          <p className="text-xs text-slate-500 font-medium">Resolved</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{resolvedCount}</p>
        </div>
        <div className="card p-4 border-l-4 border-primary-400 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 font-medium">Total</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{grievances.length}</p>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <TabBar
          tabs={[
            { key: "open",     label: `Open (${openCount})` },
            { key: "resolved", label: `Resolved (${resolvedCount})` },
            { key: "all",      label: `All (${grievances.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by student or title…"
          className="sm:ml-auto w-full sm:w-64"
        />
      </div>

      {/* ── List ─────────────────────────────────────── */}
      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState icon="📬" title="No grievances found" />
      ) : (
        <div className="space-y-4">
          {filtered.map(g => (
            <GrievanceRow
              key={g.id}
              grievance={g}
              onUpdate={(updated) => {
                setGrievances(prev => prev.map(x => x.id === updated.id ? updated : x))
                setSuccess("Updated successfully.")
              }}
              onError={setError}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function GrievanceRow({ grievance: g, onUpdate, onError }) {
  const [expanded, setExpanded]   = useState(false)
  const [reply, setReply]         = useState(g.reply || "")
  const [resolve, setResolve]     = useState(false)
  const [saving, setSaving]       = useState(false)

  // keep reply field in sync if parent updates
  useEffect(() => { setReply(g.reply || "") }, [g.reply])

  const handleReply = async () => {
    if (!reply.trim()) return onError("Reply cannot be empty.")
    try {
      setSaving(true)
      const res = await replyGrievanceAPI(g.id, { reply: reply.trim(), resolve })
      onUpdate(res.data)
      setExpanded(false)
    } catch (err) {
      onError(err.response?.data?.detail || "Failed to save reply.")
    } finally {
      setSaving(false)
    }
  }

  const handleResolve = async () => {
    try {
      setSaving(true)
      await resolveGrievanceAPI(g.id)
      onUpdate({ ...g, status: "resolved" })
    } catch {
      onError("Failed to mark as resolved.")
    } finally {
      setSaving(false)
    }
  }

  const handleReopen = async () => {
    try {
      setSaving(true)
      await reopenGrievanceAPI(g.id)
      onUpdate({ ...g, status: "open" })
    } catch {
      onError("Failed to reopen.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* ── Header ──────────────────────────────────── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition text-left">
        {/* Status dot */}
        <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${g.status === "open" ? "bg-yellow-400" : "bg-emerald-400"}`} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="font-semibold text-slate-800 text-sm">{g.title}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[g.status]}`}>
              {g.status === "open" ? "Open" : "Resolved"}
            </span>
            {g.reply && (
              <span className="text-xs text-emerald-600 font-medium">✓ Replied</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{g.student_name || `Student #${g.student_id}`}</span>
            {" · "}Submitted {fmtDate(g.created_at)}
          </p>
        </div>

        <span className="text-slate-400 text-sm flex-shrink-0 mt-1">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* ── Expanded ─────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50">
          {/* Complaint text */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Complaint</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{g.description}</p>
          </div>

          {/* Existing reply */}
          {g.reply && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
              <p className="text-xs font-medium text-emerald-700 mb-1">
                Reply by {g.replied_by} · {fmtDate(g.replied_at)}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{g.reply}</p>
            </div>
          )}

          {/* Reply form */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {g.reply ? "Update Reply" : "Write a Reply"}
            </p>
            <textarea
              className="inp min-h-[100px] resize-y"
              placeholder="Type your reply to the student…"
              value={reply}
              onChange={e => setReply(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resolve}
                  onChange={e => setResolve(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-sm text-slate-700">Mark as Resolved</span>
              </label>

              <div className="ml-auto flex gap-2">
                {/* Quick resolve without reply */}
                {g.status === "open" && !reply.trim() && (
                  <button
                    onClick={handleResolve}
                    disabled={saving}
                    className="btn-success text-sm px-4 py-2">
                    {saving ? "Saving…" : "✔ Mark Resolved"}
                  </button>
                )}
                {/* Reopen if resolved */}
                {g.status === "resolved" && (
                  <button
                    onClick={handleReopen}
                    disabled={saving}
                    className="btn-ghost text-sm px-4 py-2">
                    {saving ? "…" : "↩ Reopen"}
                  </button>
                )}
                {/* Send reply */}
                <button
                  onClick={handleReply}
                  disabled={saving || !reply.trim()}
                  className="btn-primary text-sm px-4 py-2">
                  {saving ? "Saving…" : g.reply ? "Update Reply" : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
