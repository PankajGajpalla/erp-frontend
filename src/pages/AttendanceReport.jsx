import { useEffect, useState, useMemo } from "react"
import Sidebar from "../components/Sidebar"
import { LoadingState, Alert, PaginationBar, EmptyState } from "../components/UI"
import { getAttendanceReportAPI } from "../api"

const PAGE_SIZE = 25

function PctBadge({ pct }) {
  if (pct === null || pct === undefined)
    return <span className="text-slate-400 text-xs">No records</span>
  const color =
    pct >= 85 ? "bg-green-100 text-green-700" :
    pct >= 75 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {pct >= 85 ? "✅" : pct >= 75 ? "⚠️" : "❌"} {pct.toFixed(1)}%
    </span>
  )
}

function MiniBar({ pct }) {
  if (pct === null || pct === undefined) return null
  const fill =
    pct >= 85 ? "bg-green-500" :
    pct >= 75 ? "bg-yellow-400" :
                "bg-red-500"
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all ${fill}`}
        style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export default function AttendanceReport() {
  const [report, setReport]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")

  const [search, setSearch]           = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all") // all | low | good | excellent
  const [page, setPage]               = useState(1)
  const [sortBy, setSortBy]           = useState("name")   // name | pct_asc | pct_desc
  const [view, setView]               = useState("table")  // table | cards

  useEffect(() => {
    getAttendanceReportAPI()
      .then(r => setReport(r.data.report || []))
      .catch(() => setError("Failed to load attendance report"))
      .finally(() => setLoading(false))
  }, [])

  const courses = useMemo(() =>
    [...new Set(report.map(s => s.course).filter(Boolean))].sort(),
  [report])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return report
      .filter(s => {
        const matchText = !q || s.name?.toLowerCase().includes(q) ||
          s.student_code?.toLowerCase().includes(q) ||
          s.course?.toLowerCase().includes(q)
        const matchCourse = courseFilter === "all" || s.course === courseFilter
        const pct = s.percentage
        const matchStatus =
          statusFilter === "all"       ? true :
          statusFilter === "low"       ? (pct !== null && pct < 75) :
          statusFilter === "good"      ? (pct !== null && pct >= 75 && pct < 85) :
          statusFilter === "excellent" ? (pct !== null && pct >= 85) :
          statusFilter === "none"      ? pct === null : true
        return matchText && matchCourse && matchStatus
      })
      .sort((a, b) => {
        if (sortBy === "name")     return (a.name || "").localeCompare(b.name || "")
        if (sortBy === "pct_asc")  return (a.percentage ?? -1) - (b.percentage ?? -1)
        if (sortBy === "pct_desc") return (b.percentage ?? -1) - (a.percentage ?? -1)
        return 0
      })
  }, [report, search, courseFilter, statusFilter, sortBy])

  useEffect(() => setPage(1), [search, courseFilter, statusFilter, sortBy])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary stats
  const withRecords    = report.filter(s => s.total > 0)
  const lowCount       = withRecords.filter(s => s.percentage < 75).length
  const goodCount      = withRecords.filter(s => s.percentage >= 75 && s.percentage < 85).length
  const excellentCount = withRecords.filter(s => s.percentage >= 85).length
  const avgPct         = withRecords.length
    ? (withRecords.reduce((sum, s) => sum + s.percentage, 0) / withRecords.length).toFixed(1)
    : null

  if (loading) return (
    <div className="flex min-h-screen"><Sidebar />
      <main className="page-main"><LoadingState message="Loading attendance report…" /></main>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">📊 Attendance Report</h2>
          <p className="text-sm text-slate-400 mt-1">Per-student attendance summary across all recorded sessions</p>
        </div>

        {error && <div className="mb-5"><Alert type="error" message={error} /></div>}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card p-4 border-l-4 border-slate-400">
            <p className="text-xs text-slate-500 font-medium">Total Students</p>
            <p className="text-2xl font-bold text-slate-800">{report.length}</p>
          </div>
          <div className="card p-4 border-l-4 border-green-500">
            <p className="text-xs text-slate-500 font-medium">Excellent ≥85%</p>
            <p className="text-2xl font-bold text-green-600">{excellentCount}</p>
          </div>
          <div className="card p-4 border-l-4 border-yellow-400">
            <p className="text-xs text-slate-500 font-medium">Good 75–85%</p>
            <p className="text-2xl font-bold text-yellow-600">{goodCount}</p>
          </div>
          <div className="card p-4 border-l-4 border-red-500">
            <p className="text-xs text-slate-500 font-medium">Low &lt;75%</p>
            <p className="text-2xl font-bold text-red-600">{lowCount}</p>
          </div>
        </div>

        {avgPct && (
          <div className="card p-4 mb-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-600">Institute Average Attendance</span>
                <span className={`text-lg font-bold ${
                  parseFloat(avgPct) >= 85 ? "text-green-600" :
                  parseFloat(avgPct) >= 75 ? "text-yellow-600" : "text-red-600"}`}>
                  {avgPct}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${
                  parseFloat(avgPct) >= 85 ? "bg-green-500" :
                  parseFloat(avgPct) >= 75 ? "bg-yellow-400" : "bg-red-500"}`}
                  style={{ width: `${Math.min(parseFloat(avgPct), 100)}%` }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Based on {withRecords.length} students with records</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text" placeholder="Search by name, ID, course…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="inp pl-8"
              />
            </div>

            {/* Course */}
            <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="inp w-auto">
              <option value="all">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="inp w-auto">
              <option value="all">All Status</option>
              <option value="low">🔴 Low (&lt;75%)</option>
              <option value="good">🟡 Good (75–85%)</option>
              <option value="excellent">🟢 Excellent (≥85%)</option>
              <option value="none">⚪ No Records</option>
            </select>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="inp w-auto">
              <option value="name">Sort: Name A–Z</option>
              <option value="pct_desc">Sort: Highest %</option>
              <option value="pct_asc">Sort: Lowest %</option>
            </select>

            {/* View toggle */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg ml-auto">
              <button onClick={() => setView("table")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${view === "table" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                ☰ Table
              </button>
              <button onClick={() => setView("cards")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${view === "cards" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                ⊞ Cards
              </button>
            </div>

            <p className="text-xs text-slate-400 whitespace-nowrap">
              {filtered.length} student{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Empty */}
        {filtered.length === 0 && !loading && (
          <EmptyState icon="📋" title="No students match your filters."
            subtitle="Try changing the search or filter options above." />
        )}

        {/* ── Table View ── */}
        {view === "table" && filtered.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs uppercase">
                    <th className="text-left px-5 py-3">Student</th>
                    <th className="text-left px-5 py-3">Course</th>
                    <th className="text-center px-5 py-3">Present</th>
                    <th className="text-center px-5 py-3">Absent</th>
                    <th className="text-center px-5 py-3">Total</th>
                    <th className="text-left px-5 py-3 min-w-[160px]">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paged.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold flex-shrink-0 uppercase">
                            {s.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{s.name}</p>
                            {s.student_code && (
                              <p className="text-xs text-slate-400 font-mono">{s.student_code}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.course
                          ? <span className="badge badge-blue">{s.course}</span>
                          : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-green-600">{s.present}</td>
                      <td className="px-5 py-3.5 text-center font-semibold text-red-500">{s.absent}</td>
                      <td className="px-5 py-3.5 text-center text-slate-500">{s.total}</td>
                      <td className="px-5 py-3.5">
                        <PctBadge pct={s.percentage} />
                        <MiniBar pct={s.percentage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}

        {/* ── Cards View ── */}
        {view === "cards" && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paged.map(s => {
                const pct = s.percentage
                const ringColor =
                  pct === null     ? "border-slate-200" :
                  pct >= 85        ? "border-green-400" :
                  pct >= 75        ? "border-yellow-400" :
                                     "border-red-400"
                return (
                  <div key={s.id} className={`card p-4 border-l-4 ${ringColor}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                        {s.student_code && (
                          <p className="text-xs text-slate-400 font-mono">{s.student_code}</p>
                        )}
                      </div>
                      <PctBadge pct={pct} />
                    </div>
                    {s.course && (
                      <span className="badge badge-blue mb-2 inline-block">{s.course}</span>
                    )}
                    <MiniBar pct={pct} />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span className="text-green-600 font-medium">✅ {s.present} present</span>
                      <span className="text-red-500 font-medium">❌ {s.absent} absent</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4">
              <PaginationBar page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>
          </>
        )}

      </main>
    </div>
  )
}
