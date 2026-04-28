import { useEffect, useState, useMemo, useRef } from "react"
import Sidebar from "../components/Sidebar"
import { Spinner, Alert, EmptyState, PaginationBar } from "../components/UI"
import { getAuditLogsAPI } from "../api"

const LIMIT_OPTIONS = [50, 100, 200, 500]

const ACTION_COLORS = {
  CREATE: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  UPDATE: { bg: "bg-yellow-100",  text: "text-yellow-700",  dot: "bg-yellow-500" },
  DELETE: { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500" },
}

function ActionBadge({ action }) {
  const colors = ACTION_COLORS[action?.toUpperCase()] || {
    bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400",
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {action?.toUpperCase() || "—"}
    </span>
  )
}

function formatTimestamp(ts) {
  if (!ts) return "—"
  const date = new Date(ts)
  if (isNaN(date.getTime())) return ts

  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  let relative
  if (diffSec < 60) relative = "just now"
  else if (diffMin < 60) relative = `${diffMin}m ago`
  else if (diffHr < 24) relative = `${diffHr}h ago`
  else if (diffDay < 7) relative = `${diffDay}d ago`
  else relative = null

  const formatted = date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  })
  return { formatted, relative }
}

function TimestampCell({ ts }) {
  const result = formatTimestamp(ts)
  if (!result || result === "—") return <span className="text-slate-400">—</span>
  if (typeof result === "string") return <span className="text-slate-600 text-sm">{result}</span>
  return (
    <div>
      <p className="text-slate-800 text-sm font-medium">{result.formatted}</p>
      {result.relative && <p className="text-slate-400 text-xs mt-0.5">{result.relative}</p>}
    </div>
  )
}

const LOG_PAGE_SIZE = 50

export default function AuditLog() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")

  const [search, setSearch]         = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [limit, setLimit]           = useState(100)
  const [page, setPage]             = useState(1)

  const [autoRefresh, setAutoRefresh] = useState(false)
  const autoRefreshRef              = useRef(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  async function fetchLogs(showLoader = true) {
    if (showLoader) setLoading(true)
    setError("")
    try {
      const res = await getAuditLogsAPI(limit)
      setLogs(res.data.logs || res.data || [])
      setLastRefreshed(new Date())
    } catch {
      setError("Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [limit])

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => fetchLogs(false), 30_000)
    } else {
      clearInterval(autoRefreshRef.current)
    }
    return () => clearInterval(autoRefreshRef.current)
  }, [autoRefresh, limit])

  const entityOptions = useMemo(() => {
    return [...new Set(logs.map((l) => l.entity).filter(Boolean))].sort()
  }, [logs])

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim()
    return logs.filter((log) => {
      const matchText = !q || [log.performed_by, log.entity, log.details, log.entity_id?.toString()]
        .some((field) => field?.toLowerCase().includes(q))
      const matchAction = actionFilter === "all" || log.action?.toUpperCase() === actionFilter
      const matchEntity = entityFilter === "all" || log.entity === entityFilter
      return matchText && matchAction && matchEntity
    })
  }, [logs, search, actionFilter, entityFilter])

  const hasActiveFilters = search || actionFilter !== "all" || entityFilter !== "all"

  function clearFilters() { setSearch(""); setActionFilter("all"); setEntityFilter("all") }

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [search, actionFilter, entityFilter, limit])

  const totalPages  = Math.max(1, Math.ceil(filteredLogs.length / LOG_PAGE_SIZE))
  const pagedLogs   = filteredLogs.slice((page - 1) * LOG_PAGE_SIZE, page * LOG_PAGE_SIZE)

  const lastRefreshedLabel = useMemo(() => {
    if (!lastRefreshed) return null
    return lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }, [lastRefreshed])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">🔍 Audit Log</h2>
            <p className="text-sm text-slate-500 mt-1">Track all admin actions — who did what and when</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            {lastRefreshedLabel && (
              <span className="text-xs text-slate-400">Last updated: {lastRefreshedLabel}</span>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setAutoRefresh((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${autoRefresh ? "bg-primary-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${autoRefresh ? "translate-x-5" : "translate-x-0"}`} />
              </div>
              <span className="text-xs text-slate-600 font-medium">Auto-refresh (30s)</span>
            </label>
            <button
              onClick={() => fetchLogs(true)}
              disabled={loading}
              className="btn-ghost disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : <span>↻</span>}
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search by user, entity, details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="inp"
              />
            </div>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="inp w-auto bg-white">
              <option value="all">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="inp w-auto bg-white min-w-[140px]">
              <option value="all">All Entities</option>
              {entityOptions.map((entity) => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="inp w-auto bg-white">
              {LIMIT_OPTIONS.map((l) => (
                <option key={l} value={l}>Last {l} entries</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-ghost">Clear filters</button>
            )}
            <p className="text-sm text-slate-400 ml-auto whitespace-nowrap">
              {filteredLogs.length}{hasActiveFilters ? ` / ${logs.length}` : ""} log{filteredLogs.length !== 1 ? "s" : ""}
              {totalPages > 1 && ` · page ${page}/${totalPages}`}
            </p>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="mb-4" />}

        {/* Table */}
        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 mt-6">
            <Spinner />
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={logs.length === 0 ? "No audit logs yet." : "No results match your filters."}
            subtitle={logs.length === 0
              ? "Actions like adding students, fees, etc. will appear here."
              : "Try adjusting the search or filters above."}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Entity ID</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Performed By</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pagedLogs.map((log, i) => (
                    <tr key={log.id ?? i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <TimestampCell ts={log.timestamp || log.created_at} />
                      </td>
                      <td className="px-5 py-3.5">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-700">{log.entity || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {log.entity_id != null ? (
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{log.entity_id}</span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {log.performed_by ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
                              {log.performed_by.charAt(0)}
                            </div>
                            <span className="text-slate-700 font-medium truncate max-w-[120px]" title={log.performed_by}>
                              {log.performed_by}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        {log.details ? (
                          <p className="text-slate-600 text-xs line-clamp-2" title={log.details}>{log.details}</p>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar page={page} total={filteredLogs.length} pageSize={LOG_PAGE_SIZE} onChange={setPage} />
          </div>
        )}

      </main>
    </div>
  )
}
