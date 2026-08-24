import { useEffect, useState, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getNoticesAPI } from "../api"

export default function Sidebar() {
  const { user, logout, isAdmin, isTeacher, isStaff } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [collapsed, setCollapsed]           = useState(false)
  const [mobileOpen, setMobileOpen]         = useState(false)
  const [notices, setNotices]               = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [lastSeenCount, setLastSeenCount]   = useState(() =>
    parseInt(localStorage.getItem("erp_last_seen_notices") || "0", 10)
  )
  const notifRef       = useRef(null)
  const mobileNotifRef = useRef(null)

  // Fetch notices on mount, then every 60 s (paused while tab is hidden)
  useEffect(() => {
    fetchNotices()
    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") fetchNotices()
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close panel on outside click
  useEffect(() => {
    function handler(e) {
      if (
        notifRef.current && !notifRef.current.contains(e.target) &&
        mobileNotifRef.current && !mobileNotifRef.current.contains(e.target)
      ) {
        setShowNotifPanel(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function fetchNotices() {
    try {
      const res = await getNoticesAPI()
      setNotices(res.data.notices || [])
    } catch { /* silent */ }
  }

  function handleBellClick() {
    setShowNotifPanel((v) => {
      if (!v) {
        setLastSeenCount(notices.length)
        localStorage.setItem("erp_last_seen_notices", String(notices.length))
      }
      return !v
    })
  }

  function goToNotices() {
    setShowNotifPanel(false)
    setMobileOpen(false)
    const path = isAdmin ? "/notices" : isTeacher ? "/teacher/notices" : isStaff ? "/staff/notices" : "/student/notices"
    navigate(path)
  }

  const unreadCount = Math.max(0, notices.length - lastSeenCount)

  const adminLinks = [
    { to: "/dashboard",  label: "🏠 Dashboard" },
    { to: "/students",   label: "🎓 Students" },
    { to: "/courses",    label: "📚 Courses" },
    { to: "/attendance", label: "📋 Attendance" },
    { to: "/attendance-report", label: "📊 Att. Report" },
    { to: "/fees",       label: "💰 Fees" },
    { to: "/teachers",   label: "👨‍🏫 Teachers" },
    { to: "/grades",     label: "📝 Grades" },
    { to: "/timetable",  label: "🗓️ Timetable" },
    { to: "/notices",    label: "📢 Notices" },
    { to: "/exam-schedule",   label: "📅 Exam Schedule" },
    { to: "/import",          label: "📥 Import Students" },
    { to: "/admin-accounts",  label: "⚙️ Admin Accounts" },
    { to: "/grievances",      label: "📩 Grievances" },
    { to: "/inquiries",       label: "🔎 Inquiries" },
    { to: "/tasks",           label: "✅ Tasks" },
    { to: "/audit-log",       label: "🔍 Audit Log" },
    { to: "/data-export",     label: "📤 Data Export" },
  ]

  const studentLinks = [
    { to: "/student/dashboard",  label: "🏠 My Dashboard" },
    { to: "/student/attendance", label: "📋 My Attendance" },
    { to: "/student/fees",       label: "💰 My Fees" },
    { to: "/student/grades",     label: "📝 My Grades" },
    { to: "/student/timetable",     label: "🗓️ Timetable" },
    { to: "/student/exam-schedule", label: "📅 Exam Schedule" },
    { to: "/student/notices",       label: "📢 Notices" },
    { to: "/student/grievances",    label: "📩 Grievances" },
  ]

  const teacherLinks = [
    { to: "/teacher",            label: "🏠 Dashboard" },
    { to: "/teacher/attendance", label: "📋 Attendance" },
    { to: "/teacher/students",   label: "🎓 My Students" },
    { to: "/teacher/grades",     label: "📝 Grades" },
    { to: "/teacher/timetable",     label: "🗓️ Timetable" },
    { to: "/teacher/exam-schedule", label: "📅 Exam Schedule" },
    { to: "/teacher/notices",       label: "📢 Notices" },
    { to: "/teacher/my-tasks",      label: "✅ My Tasks" },
  ]

  const staffLinks = [
    { to: "/staff/dashboard",    label: "🏠 Dashboard" },
    { to: "/staff/students",     label: "🎓 Students" },
    { to: "/staff/attendance",        label: "📋 Attendance" },
    { to: "/staff/attendance-report", label: "📊 Att. Report" },
    { to: "/staff/grades",       label: "📝 Grades" },
    { to: "/staff/notices",      label: "📢 Notices" },
    { to: "/staff/timetable",    label: "🗓️ Timetable" },
    { to: "/staff/exam-schedule", label: "📅 Exam Schedule" },
    { to: "/staff/import",       label: "📥 Import Students" },
    { to: "/staff/courses",      label: "📚 Courses" },
    { to: "/staff/grievances",   label: "📩 Grievances" },
    { to: "/staff/inquiries",    label: "🔎 Inquiries" },
    { to: "/staff/my-tasks",     label: "✅ My Tasks" },
  ]

  const links = isAdmin ? adminLinks : isTeacher ? teacherLinks : isStaff ? staffLinks : studentLinks

  function isActive(path) {
    if (path === "/teacher")           return location.pathname === "/teacher"
    if (path === "/dashboard")         return location.pathname === "/dashboard"
    if (path === "/student/dashboard") return location.pathname === "/student/dashboard"
    if (path === "/staff/dashboard")   return location.pathname === "/staff/dashboard"
    return location.pathname.startsWith(path)
  }

  // Shared notification dropdown content
  const NotifDropdown = () => (
    <div className="absolute right-0 top-10 w-72 bg-white text-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden border border-slate-100">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <span className="font-semibold text-sm text-slate-700">Notices</span>
        <button onClick={goToNotices} className="text-xs text-blue-600 hover:underline">View all</button>
      </div>
      {notices.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">No notices yet</div>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {notices.slice(0, 10).map((n, i) => (
            <li key={n.id ?? i} className="px-4 py-3 hover:bg-blue-50 transition cursor-pointer" onClick={goToNotices}>
              <p className="text-sm font-medium text-slate-800 truncate">{n.title || n.message?.slice(0, 50) || "Notice"}</p>
              {n.message && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
              )}
              {n.created_at && (
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  // Shared bell button
  const BellButton = () => (
    <button
      onClick={handleBellClick}
      title="Notifications"
      className="relative text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  )

  return (
    <>
      {/* ── Mobile Top Bar ─────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-slate-900 flex items-center justify-between px-4 z-30 md:hidden border-b border-slate-700">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ABS" className="w-7 h-7 object-contain bg-white rounded p-0.5" />
          <span className="text-white font-bold text-sm">ABS Foundation</span>
        </div>
        {/* Bell on mobile top bar */}
        <div className="relative" ref={mobileNotifRef}>
          <BellButton />
          {showNotifPanel && <NotifDropdown />}
        </div>
      </div>

      {/* ── Mobile Backdrop ─────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar Panel ───────────────────────────────── */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-slate-900 text-white flex flex-col transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        w-64
        md:static md:translate-x-0 md:z-auto md:h-screen md:sticky md:top-0
        ${collapsed ? "md:w-14" : "md:w-64"}
        flex-shrink-0
      `}>

        {/* Header — desktop only */}
        <div className="hidden md:flex items-center justify-between px-4 py-5 border-b border-slate-700 gap-2">
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src="/logo.png" alt="ABS Foundation" className="w-9 h-9 object-contain flex-shrink-0 bg-white rounded-lg p-0.5" />
              <div className="min-w-0">
                <h1 className="text-base font-bold text-blue-400 leading-tight">ABS Foundation</h1>
                <p className="text-xs text-slate-400 truncate">
                  {user?.sub} · <span className="capitalize">{user?.role}</span>
                </p>
              </div>
            </div>
          )}

          {/* Bell — desktop */}
          <div className="relative flex-shrink-0" ref={notifRef}>
            <BellButton />
            {showNotifPanel && <NotifDropdown />}
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700 flex-shrink-0"
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Mobile sidebar header */}
        <div className="md:hidden flex items-center justify-between px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="ABS" className="w-8 h-8 object-contain bg-white rounded-lg p-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-400">ABS Foundation</p>
              <p className="text-xs text-slate-400">{user?.sub} · <span className="capitalize">{user?.role}</span></p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? link.label : ""}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive(link.to) ? "bg-primary-600 text-white" : "text-slate-300 hover:bg-slate-700/70 hover:text-white"}`}
            >
              <span className="text-lg flex-shrink-0">{link.label.split(" ")[0]}</span>
              <span className={`truncate flex-1 ${collapsed ? "md:hidden" : ""}`}>
                {link.label.split(" ").slice(1).join(" ")}
              </span>
              {unreadCount > 0 && link.label.includes("Notices") && (
                <span className={`bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${collapsed ? "md:hidden" : ""}`}>
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-slate-700">
          <button
            onClick={logout}
            title={collapsed ? "Logout" : ""}
            className="w-full flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm transition"
          >
            <span className="text-lg">🚪</span>
            <span className={collapsed ? "md:hidden" : ""}>Logout</span>
          </button>
        </div>

      </div>
    </>
  )
}
