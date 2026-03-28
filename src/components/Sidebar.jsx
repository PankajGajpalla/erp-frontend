import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const adminLinks = [
    { to: "/dashboard", label: "🏠 Dashboard" },
    { to: "/students", label: "🎓 Students" },
    { to: "/attendance", label: "📋 Attendance" },
    { to: "/fees", label: "💰 Fees" },
    { to: "/teachers", label: "👨‍🏫 Teachers" },
    { to: "/grades", label: "📝 Grades" },
    { to: "/timetable", label: "🗓️ Timetable" },
    { to: "/notices", label: "📢 Notices" },
    { to: "/import", label: "📥 Import Students" },
  ]

  const studentLinks = [
    { to: "/dashboard", label: "🏠 My Dashboard" },
    { to: "/fees", label: "💰 My Fees" },
    { to: "/grades", label: "📝 My Grades" },
    { to: "/timetable", label: "🗓️ Timetable" },
    { to: "/notices", label: "📢 Notices" },
  ]

  const links = user?.role === "admin" ? adminLinks : studentLinks

  return (
    <div className={`${collapsed ? "w-16" : "w-64"} min-h-screen bg-gray-900 text-white flex flex-col sticky top-0 h-screen transition-all duration-300`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-blue-400">ERP</h1>
            <p className="text-xs text-gray-400 mt-0.5">{user?.sub} · {user?.role}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-gray-700"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            title={collapsed ? link.label : ""}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
              ${location.pathname === link.to
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
          >
            <span className="text-lg">{link.label.split(" ")[0]}</span>
            {!collapsed && (
              <span>{link.label.split(" ").slice(1).join(" ")}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-gray-700">
        <button
          onClick={logout}
          title={collapsed ? "Logout" : ""}
          className="w-full flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm transition"
        >
          <span className="text-lg">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

    </div>
  )
}