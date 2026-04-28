/**
 * Shared UI primitives for ABS Foundation ERP
 * Import what you need: import { PageHeader, StatCard, Alert, ... } from "../components/UI"
 */

/* ── PageHeader ─────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

/* ── StatCard ────────────────────────────────────────────── */
const colorMap = {
  blue:   "border-primary-500 text-primary-600",
  green:  "border-emerald-500 text-emerald-600",
  yellow: "border-yellow-500 text-yellow-600",
  red:    "border-red-500 text-red-600",
  purple: "border-purple-500 text-purple-600",
  slate:  "border-slate-400 text-slate-500",
}

export function StatCard({ label, value, icon, color = "blue", sub }) {
  const accent = colorMap[color] ?? colorMap.blue
  return (
    <div className={`card border-l-4 p-4 sm:p-5 ${accent.split(" ")[0]}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-3xl opacity-25 flex-shrink-0 ml-2">{icon}</span>}
      </div>
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────────────── */
export function EmptyState({ icon = "📭", title = "No data found", subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span className="text-5xl opacity-30">{icon}</span>
      <p className="text-slate-600 font-medium">{title}</p>
      {subtitle && <p className="text-slate-400 text-sm max-w-xs">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* ── Spinner ─────────────────────────────────────────────── */
export function Spinner({ size = "md", className = "" }) {
  const sz = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-8 h-8" }[size] ?? "w-5 h-5"
  return (
    <div
      className={`${sz} border-2 border-primary-500 border-t-transparent rounded-full animate-spin ${className}`}
    />
  )
}

export function LoadingState({ message = "Loading…" }) {
  return (
    <div className="flex items-center gap-3 text-slate-500 py-10 justify-center">
      <Spinner />
      <span className="text-sm">{message}</span>
    </div>
  )
}

/* ── Alert ───────────────────────────────────────────────── */
const alertStyles = {
  error:   "bg-red-50 border-red-200 text-red-700",
  success: "bg-emerald-50 border-emerald-200 text-emerald-700",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  info:    "bg-blue-50 border-blue-200 text-blue-700",
}
const alertIcons = { error: "⚠️", success: "✅", warning: "⚠️", info: "ℹ️" }

export function Alert({ type = "error", message, onClose }) {
  if (!message) return null
  return (
    <div className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 text-sm ${alertStyles[type] ?? alertStyles.info}`}>
      <span className="flex-shrink-0 mt-px">{alertIcons[type]}</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition text-lg leading-none">×</button>
      )}
    </div>
  )
}

/* ── SectionCard ─────────────────────────────────────────── */
export function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            {title && <h3 className="section-title">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ── TableWrapper ────────────────────────────────────────── */
export function TableWrapper({ children, className = "" }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-100 ${className}`}>
      {children}
    </div>
  )
}

/* ── ConfirmPopover ──────────────────────────────────────── */
export function ConfirmPopover({ message = "Are you sure?", onConfirm, onCancel }) {
  return (
    <div className="absolute z-50 right-0 top-8 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
      <p className="text-sm text-slate-700 mb-3">{message}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
        <button onClick={onConfirm} className="btn-danger text-xs px-3 py-1.5">Delete</button>
      </div>
    </div>
  )
}

/* ── TabBar ──────────────────────────────────────────────── */
export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
      {tabs.map((tab) => {
        const key   = typeof tab === "string" ? tab : tab.key
        const label = typeof tab === "string" ? tab : tab.label
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${active === key
                ? "bg-white text-primary-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ── SearchBar ───────────────────────────────────────────── */
export function SearchBar({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="inp pl-9"
      />
    </div>
  )
}
