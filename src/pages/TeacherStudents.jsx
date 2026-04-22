import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { getStudentsByCourseAPI, getStudentAPI, attendanceSummaryAPI, subjectWiseAttendanceAPI } from "../api"

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value || "—"}</p>
    </div>
  )
}

export default function TeacherStudents() {
  const [course, setCourse]               = useState("")
  const [studentId, setStudentId]         = useState("")
  const [students, setStudents]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [attendance, setAttendance]       = useState(null)
  const [subjectAtt, setSubjectAtt]       = useState([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError]   = useState("")

  async function searchByCourse(e) {
    e.preventDefault()
    if (!course.trim()) { setError("Enter a course name"); return }
    setLoading(true); setError(""); setStudents([])
    try {
      const res = await getStudentsByCourseAPI(course.trim())
      setStudents(res.data.students)
      if (res.data.students.length === 0) setError(`No students found in "${course}"`)
    } catch { setError("Failed to load students") }
    finally { setLoading(false) }
  }

  async function searchById(e) {
    e.preventDefault()
    if (!studentId) { setError("Enter a student ID"); return }
    setLoading(true); setError(""); setStudents([])
    try {
      const res = await getStudentAPI(studentId)
      setStudents([res.data])
    } catch { setError("Student not found") }
    finally { setLoading(false) }
  }

  async function handleView(student) {
    setSelectedStudent(student)
    setDetailsLoading(true)
    setAttendance(null)
    setSubjectAtt([])
    setDetailsError("")
    try {
      const [attRes, subRes] = await Promise.all([
        attendanceSummaryAPI(student.id),
        subjectWiseAttendanceAPI(student.id),
      ])
      setAttendance(attRes.data)
      setSubjectAtt(subRes.data.subjects || [])
    } catch { setDetailsError("Failed to load attendance") }
    finally { setDetailsLoading(false) }
  }

  function closeModal() {
    setSelectedStudent(null)
    setAttendance(null)
    setSubjectAtt([])
    setDetailsError("")
  }

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedStudent) return
    function onKey(e) { if (e.key === "Escape") closeModal() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [selectedStudent])

  const pct = attendance?.attendance_percentage ?? 0
  const pctColor = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"
  const pctText  = pct >= 75 ? "✅ Good attendance" : pct >= 50 ? "⚠️ Below 75%" : "❌ Critical"

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">My Students</h2>

        {/* Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Search by Course</p>
            <form onSubmit={searchByCourse} className="flex gap-2">
              <input type="text" placeholder="e.g. BCA, Class 10" value={course}
                onChange={(e) => { setCourse(e.target.value); setError("") }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
                Search
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Search by Student ID</p>
            <form onSubmit={searchById} className="flex gap-2">
              <input type="number" placeholder="e.g. 5" value={studentId} min="1"
                onChange={(e) => { setStudentId(e.target.value); setError("") }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={loading}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50">
                Search
              </button>
            </form>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-500 mb-4">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Searching...
          </div>
        )}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {/* Student Table */}
        {students.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="font-semibold text-gray-700">{students.length} student{students.length > 1 ? "s" : ""} found</p>
              <p className="text-xs text-gray-400 mt-0.5">Click View to see full details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white text-xs uppercase">
                    <th className="text-left px-5 py-3">Student ID</th>
                    <th className="text-left px-5 py-3">Photo</th>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Course</th>
                    <th className="text-left px-5 py-3">Mobile</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                          {s.student_code || `#${s.id}`}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {s.photo
                          ? <img src={s.photo} alt={s.name} className="w-9 h-10 rounded object-cover border border-gray-200" />
                          : <div className="w-9 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs border">N/A</div>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        {s.course
                          ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{s.course}</span>
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{s.phone || "—"}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleView(s)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student Detail Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-gray-800">Student Details</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              <div className="p-6 space-y-6">

                {/* Profile banner */}
                <div className="flex gap-4 items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                  {selectedStudent.photo
                    ? <img src={selectedStudent.photo} alt={selectedStudent.name} className="w-20 h-24 rounded-xl object-cover border-2 border-white shadow flex-shrink-0" />
                    : <div className="w-20 h-24 rounded-xl bg-blue-100 flex items-center justify-center text-blue-400 text-3xl flex-shrink-0 border-2 border-white shadow">🎓</div>
                  }
                  <div>
                    {selectedStudent.student_code && (
                      <span className="inline-block bg-white text-gray-500 text-xs font-mono px-2 py-0.5 rounded border mb-1">
                        {selectedStudent.student_code}
                      </span>
                    )}
                    <p className="text-xl font-bold text-gray-800">{selectedStudent.name}</p>
                    {selectedStudent.father_name && (
                      <p className="text-sm text-gray-500">S/o {selectedStudent.father_name}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedStudent.course && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {selectedStudent.course}
                        </span>
                      )}
                      {(selectedStudent.additional_courses || []).map((ac) => (
                        <span key={ac.id} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          +{ac.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoRow label="Date of Birth"  value={selectedStudent.dob} />
                    <InfoRow label="Email"          value={selectedStudent.email} />
                    <InfoRow label="Mobile No."     value={selectedStudent.phone} />
                    <InfoRow label="Parent Mobile"  value={selectedStudent.parent_phone} />
                    <InfoRow label="Medium"         value={selectedStudent.medium ? selectedStudent.medium.charAt(0).toUpperCase() + selectedStudent.medium.slice(1) : null} />
                    <InfoRow label="Admission Date" value={selectedStudent.admission_date} />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Permanent Address" value={selectedStudent.permanent_address} />
                    <InfoRow label="Local Address"     value={selectedStudent.local_address} />
                  </div>
                </div>

                {/* Academic */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Academic Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="School / College" value={selectedStudent.school_college_name} />
                    <InfoRow label="Course"           value={selectedStudent.course} />
                  </div>
                  {(selectedStudent.additional_courses || []).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Additional Courses</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedStudent.additional_courses.map((ac) => (
                          <span key={ac.id} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {ac.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attendance */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attendance</p>
                  {detailsLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading attendance...
                    </div>
                  ) : detailsError ? (
                    <p className="text-red-500 text-sm">{detailsError}</p>
                  ) : attendance ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-600">{pct}%</p>
                          <p className="text-xs text-gray-500 mt-0.5">Overall</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600">{attendance.present}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Present</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-gray-600">{attendance.total_classes}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Total</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                        <div className={`h-2 rounded-full ${pctColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">{pctText}</p>

                      {/* Subject-wise */}
                      {subjectAtt.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 mb-2">Subject-wise</p>
                          {subjectAtt.map((s) => (
                            <div key={s.subject}>
                              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                                <span>{s.subject}</span>
                                <span className={s.percentage >= 75 ? "text-green-600" : s.percentage >= 50 ? "text-yellow-600" : "text-red-600"}>
                                  {s.percentage}% ({s.present}/{s.total})
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${s.percentage >= 75 ? "bg-green-500" : s.percentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                                  style={{ width: `${s.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>

              </div>

              <div className="px-6 py-4 border-t sticky bottom-0 bg-white flex justify-end">
                <button onClick={closeModal}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm transition">
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
