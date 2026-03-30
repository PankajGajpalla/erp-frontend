import { useState } from "react"
import Sidebar from "../components/Sidebar"
import { getStudentsByCourseAPI, getStudentAPI, attendanceSummaryAPI, feesSummaryAPI } from "../api"

export default function TeacherStudents() {
  const [course, setCourse] = useState("")
  const [studentId, setStudentId] = useState("")
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentDetails, setStudentDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  async function searchByCourse(e) {
    e.preventDefault()
    if (!course) {
      setError("Enter a course name")
      return
    }
    setLoading(true)
    setError("")
    setStudents([])
    try {
      const res = await getStudentsByCourseAPI(course)
      setStudents(res.data.students)
      if (res.data.students.length === 0) {
        setError(`No students found in course "${course}"`)
      }
    } catch (err) {
      setError("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  async function searchById(e) {
    e.preventDefault()
    if (!studentId) {
      setError("Enter a student ID")
      return
    }
    setLoading(true)
    setError("")
    setStudents([])
    try {
      const res = await getStudentAPI(studentId)
      setStudents([res.data])
    } catch (err) {
      setError("Student not found")
    } finally {
      setLoading(false)
    }
  }

  async function handleStudentClick(student) {
    setSelectedStudent(student)
    setDetailsLoading(true)
    setStudentDetails(null)
    try {
      const [attRes, feesRes] = await Promise.all([
        attendanceSummaryAPI(student.id),
        feesSummaryAPI(student.id)
      ])
      setStudentDetails({
        attendance: attRes.data,
        fees: feesRes.data
      })
    } catch (err) {
      console.error(err)
    } finally {
      setDetailsLoading(false)
    }
  }

  function closeModal() {
    setSelectedStudent(null)
    setStudentDetails(null)
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🎓 My Students</h2>

        {/* Search Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Search by Course */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Search by Course</h3>
            <form onSubmit={searchByCourse} className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. BCA, MCA"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Search
              </button>
            </form>
          </div>

          {/* Search by Student ID */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Search by Student ID</h3>
            <form onSubmit={searchById} className="flex gap-3">
              <input
                type="number"
                placeholder="e.g. 5"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" disabled={loading}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                Search
              </button>
            </form>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Students Table */}
        {students.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-700">
                {students.length} student{students.length > 1 ? "s" : ""} found
              </h3>
              <p className="text-sm text-gray-400 mt-1">Click on a student name to view details</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Course</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-blue-50 transition cursor-pointer"
                    onClick={() => handleStudentClick(s)}>
                    <td className="px-6 py-3">{s.id}</td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-blue-600 hover:underline">
                        {s.name}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {s.course
                        ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{s.course}</span>
                        : "—"}
                    </td>
                    <td className="px-6 py-3">{s.email}</td>
                    <td className="px-6 py-3">{s.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Student Detail Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h3 className="text-xl font-bold text-gray-800">Student Details</h3>
                <button onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">

                {/* Profile */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                    🎓
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h4>
                    <p className="text-gray-500">
                      {selectedStudent.course || "No course assigned"} · ID: {selectedStudent.id}
                    </p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Age</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.age}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Course</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.course || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Phone</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.phone || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Address</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.address || "—"}</p>
                  </div>
                </div>

                {/* Attendance & Fees */}
                {detailsLoading ? (
                  <p className="text-gray-400 text-center py-4">Loading details...</p>
                ) : studentDetails ? (
                  <>
                    {/* Attendance Summary */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">📋 Attendance</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {studentDetails.attendance.attendance_percentage}%
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Attendance</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {studentDetails.attendance.present}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Present</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-gray-600">
                            {studentDetails.attendance.total_classes}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Total Classes</p>
                        </div>
                      </div>
                    </div>

                    {/* Fees Summary */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">💰 Fees</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            ₹{studentDetails.fees.total_fees}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Total</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">
                            ₹{studentDetails.fees.paid}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Paid</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-red-600">
                            ₹{studentDetails.fees.pending}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Pending</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t flex justify-end">
                <button onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}