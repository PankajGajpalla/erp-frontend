import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { LoadingState, Alert } from "../components/UI"
import { getStudentsByCourseAPI, getStudentAPI, attendanceSummaryAPI, subjectWiseAttendanceAPI } from "../api"

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-0.5">{value || "—"}</p>
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
      <main className="page-main">
        <h2 className="text-xl font-bold text-slate-800 mb-6">My Students</h2>

        {/* Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Search by Course</p>
            <form onSubmit={searchByCourse} className="flex gap-2">
              <input type="text" placeholder="e.g. BCA, Class 10" value={course}
                onChange={(e) => { setCourse(e.target.value); setError("") }}
                className="inp" />
              <button type="submit" disabled={loading} className="btn-primary">Search</button>
            </form>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Search by Student ID</p>
            <form onSubmit={searchById} className="flex gap-2">
              <input type="number" placeholder="e.g. 5" value={studentId} min="1"
                onChange={(e) => { setStudentId(e.target.value); setError("") }}
                className="inp" />
              <button type="submit" disabled={loading} className="btn-ghost">Search</button>
            </form>
          </div>
        </div>

        {loading && <div className="mb-4"><LoadingState message="Searching..." /></div>}
        {error && <Alert type="error" message={error} onClose={() => setError("")} />}

        {/* Student Table */}
        {students.length > 0 && (
          <div className="card overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-700">{students.length} student{students.length > 1 ? "s" : ""} found</p>
              <p className="text-xs text-slate-400 mt-0.5">Click View to see full details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Course</th>
                    <th>Mobile</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                          {s.student_code || `#${s.id}`}
                        </span>
                      </td>
                      <td>
                        {s.photo
                          ? <img src={s.photo} alt={s.name} className="w-9 h-10 rounded object-cover border border-slate-200" />
                          : <div className="w-9 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs border">N/A</div>
                        }
                      </td>
                      <td>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </td>
                      <td>
                        {s.course
                          ? <span className="badge-blue">{s.course}</span>
                          : "—"}
                      </td>
                      <td className="text-slate-600">{s.phone || "—"}</td>
                      <td>
                        <button onClick={() => handleView(s)} className="btn-primary text-xs px-3 py-1">View</button>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>

              <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-800">Student Details</h3>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
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
                      <span className="inline-block bg-white text-slate-500 text-xs font-mono px-2 py-0.5 rounded border mb-1">
                        {selectedStudent.student_code}
                      </span>
                    )}
                    <p className="text-xl font-bold text-slate-800">{selectedStudent.name}</p>
                    {selectedStudent.father_name && (
                      <p className="text-sm text-slate-500">S/o {selectedStudent.father_name}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedStudent.course && (
                        <span className="badge-blue">{selectedStudent.course}</span>
                      )}
                      {(selectedStudent.additional_courses || []).map((ac) => (
                        <span key={ac.id} className="badge badge-purple">+{ac.name}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Information</p>
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
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Address</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Permanent Address" value={selectedStudent.permanent_address} />
                    <InfoRow label="Local Address"     value={selectedStudent.local_address} />
                  </div>
                </div>

                {/* Academic */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Academic Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="School / College" value={selectedStudent.school_college_name} />
                    <InfoRow label="Course"           value={selectedStudent.course} />
                  </div>
                  {(selectedStudent.additional_courses || []).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Additional Courses</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedStudent.additional_courses.map((ac) => (
                          <span key={ac.id} className="badge-purple">{ac.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attendance */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Attendance</p>
                  {detailsLoading ? (
                    <LoadingState message="Loading attendance..." />
                  ) : detailsError ? (
                    <Alert type="error" message={detailsError} />
                  ) : attendance ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-600">{pct}%</p>
                          <p className="text-xs text-slate-500 mt-0.5">Overall</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600">{attendance.present}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Present</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-slate-600">{attendance.total_classes}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Total</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                        <div className={`h-2 rounded-full ${pctColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-400">{pctText}</p>

                      {subjectAtt.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Subject-wise</p>
                          {subjectAtt.map((s) => (
                            <div key={s.subject}>
                              <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                                <span>{s.subject}</span>
                                <span className={s.percentage >= 75 ? "text-green-600" : s.percentage >= 50 ? "text-yellow-600" : "text-red-600"}>
                                  {s.percentage}% ({s.present}/{s.total})
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5">
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
                <button onClick={closeModal} className="btn-ghost">Close</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
