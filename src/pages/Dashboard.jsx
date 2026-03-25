import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/Sidebar"
import {
  getStudentsAPI,
  getAttendanceAPI,
  getStudentAPI,
  getStudentAttendanceAPI,
  attendanceSummaryAPI,
  getFeesAPI,
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
  const [attendance, setAttendance] = useState([])
  const [summary, setSummary] = useState(null)
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, attRes, summaryRes, feesRes] = await Promise.all([
          getStudentAPI(studentId),
          getStudentAttendanceAPI(studentId),
          attendanceSummaryAPI(studentId),
          getFeesAPI(studentId),
        ])
        setProfile(profileRes.data)
        setAttendance(attRes.data.attendance)
        setSummary(summaryRes.data)
        setFees(feesRes.data.fees)
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
        </div>
      )}

      {/* Attendance Summary */}
      {summary && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">📋 Attendance Summary</h3>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{summary.attendance_percentage}%</p>
              <p className="text-sm text-gray-500">Attendance</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{summary.present}</p>
              <p className="text-sm text-gray-500">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{summary.total_classes}</p>
              <p className="text-sm text-gray-500">Total Classes</p>
            </div>
          </div>

          {/* Attendance Table */}
          <table className="w-full mt-4 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr><td colSpan="2" className="px-4 py-3 text-gray-400">No records yet.</td></tr>
              ) : (
                attendance.map((a, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{a.date}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${a.status === "present"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Fees Table */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">💰 My Fees</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr><td colSpan="2" className="px-4 py-3 text-gray-400">No fee records yet.</td></tr>
            ) : (
              fees.map((f, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">₹{f.amount}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${f.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"}`}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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