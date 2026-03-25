import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const adminLinks = [
  { to: "/dashboard", label: "🏠 Dashboard" },
  { to: "/students", label: "🎓 Students" },
  { to: "/attendance", label: "📋 Attendance" },
  { to: "/fees", label: "💰 Fees" },
  { to: "/teachers", label: "👨‍🏫 Teachers" },
  { to: "/grades", label: "📝 Grades" },
  { to: "/timetable", label: "🗓️ Timetable" },
  { to: "/notices", label: "📢 Notices" },
]

  const studentLinks = [
  { to: "/dashboard", label: "🏠 My Dashboard" },
  { to: "/grades", label: "📝 My Grades" },
  { to: "/timetable", label: "🗓️ Timetable" },
  { to: "/notices", label: "📢 Notices" },
]

  const links = user?.role === "admin" ? adminLinks : studentLinks

  return (
    <div className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-blue-400">ERP System</h1>
        <p className="text-xs text-gray-400 mt-1">
          {user?.sub} · {user?.role}
        </p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition
              ${location.pathname === link.to
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-6 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm transition"
        >
          Logout
        </button>
      </div>

    </div>
  )
}