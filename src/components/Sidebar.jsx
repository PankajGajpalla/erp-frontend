import { useEffect, useState, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getNoticesAPI } from "../api"

export default function Sidebar() {
  const { user, logout, isAdmin, isTeacher } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [collapsed, setCollapsed]         = useState(window.innerWidth < 768)
  const [notices, setNotices]             = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [lastSeenCount, setLastSeenCount] = useState(() =>
    parseInt(localStorage.getItem("erp_last_seen_notices") || "0", 10)
  )
  const notifRef = useRef(null)

  // Fetch notices on mount, then every 60 s
  useEffect(() => {
    fetchNotices()
    const interval = setInterval(fetchNotices, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close panel on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
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
        // mark all as seen
        setLastSeenCount(notices.length)
        localStorage.setItem("erp_last_seen_notices", String(notices.length))
      }
      return !v
    })
  }

  function goToNotices() {
    setShowNotifPanel(false)
    const path = isAdmin ? "/notices" : isTeacher ? "/teacher/notices" : "/student/notices"
    navigate(path)
  }

  const unreadCount = Math.max(0, notices.length - lastSeenCount)

  const adminLinks = [
    { to: "/dashboard",  label: "🏠 Dashboard" },
    { to: "/students",   label: "🎓 Students" },
    { to: "/courses",    label: "📚 Courses" },
    { to: "/attendance", label: "📋 Attendance" },
    { to: "/fees",       label: "💰 Fees" },
    { to: "/teachers",   label: "👨‍🏫 Teachers" },
    { to: "/grades",     label: "📝 Grades" },
    { to: "/timetable",  label: "🗓️ Timetable" },
    { to: "/notices",    label: "📢 Notices" },
    { to: "/import",     label: "📥 Import Students" },
  ]

  const studentLinks = [
    { to: "/student/dashboard",  label: "🏠 My Dashboard" },
    { to: "/student/attendance", label: "📋 My Attendance" },
    { to: "/student/fees",       label: "💰 My Fees" },
    { to: "/student/grades",     label: "📝 My Grades" },
    { to: "/student/timetable",  label: "🗓️ Timetable" },
    { to: "/student/notices",    label: "📢 Notices" },
  ]

  const teacherLinks = [
    { to: "/teacher",            label: "🏠 Dashboard" },
    { to: "/teacher/attendance", label: "📋 Attendance" },
    { to: "/teacher/students",   label: "🎓 My Students" },
    { to: "/teacher/grades",     label: "📝 Grades" },
    { to: "/teacher/timetable",  label: "🗓️ Timetable" },
    { to: "/teacher/notices",    label: "📢 Notices" },
  ]

  const links = isAdmin ? adminLinks : isTeacher ? teacherLinks : studentLinks

  function isActive(path) {
    if (path === "/teacher")           return location.pathname === "/teacher"
    if (path === "/dashboard")         return location.pathname === "/dashboard"
    if (path === "/student/dashboard") return location.pathname === "/student/dashboard"
    return location.pathname.startsWith(path)
  }

  return (
    <div className={`${collapsed ? "w-14" : "w-64"} flex-shrink-0 min-h-screen bg-gray-900 text-white flex flex-col sticky top-0 h-screen transition-all duration-300 z-30`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700 gap-2">
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-blue-400">ERP System</h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {user?.sub} · <span className="capitalize">{user?.role}</span>
            </p>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative flex-shrink-0" ref={notifRef}>
          <button onClick={handleBellClick}
            title="Notifications"
            className="relative text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-gray-700">
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

          {/* Dropdown Panel */}
          {showNotifPanel && (
            <div className="absolute left-0 top-10 w-72 bg-white text-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100"
              style={{ left: collapsed ? "2.5rem" : undefined }}>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <span className="font-semibold text-sm text-gray-700">Notices</span>
                <button onClick={goToNotices} className="text-xs text-blue-600 hover:underline">View all</button>
              </div>
              {notices.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">No notices yet</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {notices.slice(0, 10).map((n, i) => (
                    <li key={n.id ?? i} className="px-4 py-3 hover:bg-blue-50 transition cursor-pointer" onClick={goToNotices}>
                      <p className="text-sm font-medium text-gray-800 truncate">{n.title || n.message?.slice(0, 50) || "Notice"}</p>
                      {n.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      {n.created_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-gray-700 flex-shrink-0">
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <Link key={link.to} to={link.to} title={collapsed ? link.label : ""}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
              ${isActive(link.to) ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}>
            <span className="text-lg flex-shrink-0">{link.label.split(" ")[0]}</span>
            {!collapsed && (
              <span className="truncate flex-1">{link.label.split(" ").slice(1).join(" ")}</span>
            )}
            {/* Badge on Notices link */}
            {!collapsed && unreadCount > 0 && link.label.includes("Notices") && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
                {unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-gray-700">
        <button onClick={logout} title={collapsed ? "Logout" : ""}
          className="w-full flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm transition">
          <span className="text-lg">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

    </div>
  )
}
