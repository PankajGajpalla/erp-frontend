import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/Sidebar"
import {
  getStudentsAPI,
  getAttendanceAPI,
  getStudentAPI,
  // getStudentAttendanceAPI,
  // attendanceSummaryAPI,
  // getFeesAPI,
  feesSummaryAPI
} from "../api"

// ─── Admin Stats Card ───────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  )
}

// ─── Admin Dashboard ────────────────────────────────────────
function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAttendance: 0,
    totalFees: 0,
    totalPaid: 0,
    totalPending: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
        async function load() {
      try {
        const studentsRes = await getStudentsAPI()
        const attendanceRes = await getAttendanceAPI()
        const students = studentsRes.data.students

        let totalFees = 0
        let totalPaid = 0
        let totalPending = 0

        for (let s of students) {
          const res = await feesSummaryAPI(s.id)
          totalFees += res.data.total_fees
          totalPaid += res.data.paid
          totalPending += res.data.pending
        }

        setStats({
          totalStudents: students.length,
          totalAttendance: attendanceRes.data.attendance.length,
          totalFees,
          totalPaid,
          totalPending,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className="text-gray-500">Loading dashboard...</p>

  return (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard label="Total Students" value={stats.totalStudents} color="border-blue-500" />
      <StatCard label="Attendance Records" value={stats.totalAttendance} color="border-green-500" />
      <StatCard label="Total Fees ₹" value={`₹${stats.totalFees}`} color="border-yellow-500" />
      <StatCard label="Fees Collected ₹" value={`₹${stats.totalPaid}`} color="border-green-500" />
      <StatCard label="Fees Pending ₹" value={`₹${stats.totalPending}`} color="border-red-500" />
    </div>
  </div>
  )
}

// ─── Student Dashboard ───────────────────────────────────────
function StudentDashboard({ studentId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, attRes, summaryRes] = await Promise.all([
          getStudentAPI(studentId),
        ])
        setProfile(profileRes.data)
        setAttendance(attRes.data.attendance)
        setSummary(summaryRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId])

  if (loading) return <p className="text-gray-500">Loading your dashboard...</p>

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">My Dashboard</h2>

      {/* Profile Cards */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Name" value={profile.name} color="border-blue-500" />
          <StatCard label="Age" value={profile.age} color="border-purple-500" />
          <StatCard label="Email" value={profile.email} color="border-pink-500" />
          <StatCard label="Course" value={profile.course || "—"} color="border-yellow-500" />
          <StatCard label="Phone" value={profile.phone || "—"} color="border-green-500" />
          <StatCard label="Address" value={profile.address || "—"} color="border-orange-500" />
        </div>
      )}

      
    </div>
  )
}

// ─── Main Dashboard Page ─────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        {user?.role === "admin"
          ? <AdminDashboard />
          : <StudentDashboard studentId={user?.student_id} />
        }
      </main>
    </div>
  )
}