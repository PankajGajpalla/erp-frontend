import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { LoadingState, Alert } from "../components/UI"
import {
  getTimetableByCourseAPI, addTimetableAPI, deleteTimetableAPI,
  getCoursesAPI, getStudentAPI, getSubjectsByCourseAPI, getTeachersAPI,
  getMyTimetableAPI,
} from "../api"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const EMPTY_FORM = { day: "Monday", subject: "", teacher: "", time_slot: "" }

// ── Timetable grid shared by all roles ───────────────────────────────────────
function TimetableGrid({ timetable, isAdmin, onDelete, deleteConfirmId, setDeleteConfirmId }) {
  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = timetable.filter((e) => e.day === day)
    return acc
  }, {})

  const daysWithClasses = DAYS.filter((d) => grouped[d].length > 0)
  const daysToShow = isAdmin ? DAYS : daysWithClasses

  if (daysWithClasses.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-4xl mb-3">🗓️</p>
        <p className="text-slate-400">No timetable entries for this course yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {daysToShow.map((day) => (
        <div key={day} className="card overflow-hidden">
          <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center">
            <h3 className="font-semibold">{day}</h3>
            <span className="text-xs text-slate-400">
              {grouped[day].length} class{grouped[day].length !== 1 ? "es" : ""}
            </span>
          </div>
          {grouped[day].length === 0 ? (
            <p className="px-5 py-4 text-slate-400 text-sm italic">No classes</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped[day].map((entry) => (
                <div key={entry.id} className="px-5 py-4 flex justify-between items-start hover:bg-slate-50 transition">
                  <div>
                    <p className="font-medium text-slate-800">{entry.subject}</p>
                    <p className="text-sm text-slate-500 mt-0.5">👨‍🏫 {entry.teacher}</p>
                    <p className="text-sm text-primary-600 mt-0.5">🕐 {entry.time_slot}</p>
                  </div>
                  {isAdmin && (
                    deleteConfirmId === entry.id ? (
                      <div className="flex gap-1 items-center ml-2 flex-shrink-0">
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button onClick={() => onDelete(entry.id)}
                          className="bg-red-500 text-white px-2 py-0.5 rounded text-xs hover:bg-red-600 transition">Yes</button>
                        <button onClick={() => setDeleteConfirmId(null)}
                          className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs hover:bg-slate-300 transition">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(entry.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs ml-2 flex-shrink-0 transition">
                        Delete
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Teacher personal timetable view ──────────────────────────────────────────
function TeacherTimetable() {
  const [timetable, setTimetable]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState("")
  const [teacherName, setTeacherName] = useState("")

  useEffect(() => {
    getMyTimetableAPI()
      .then(r => { setTimetable(r.data.timetable || []); setTeacherName(r.data.teacher_name || "") })
      .catch(() => setError("Failed to load your timetable"))
      .finally(() => setLoading(false))
  }, [])

  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]
  const todayClasses = timetable
    .filter(e => e.day === todayName)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot))

  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = timetable.filter(e => e.day === day).sort((a, b) => a.time_slot.localeCompare(b.time_slot))
    return acc
  }, {})
  const activeDays = DAYS.filter(d => grouped[d].length > 0)

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main"><LoadingState message="Loading your timetable..." /></main>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">🗓️ My Timetable</h2>
          {teacherName && (
            <p className="text-sm text-slate-400 mt-1">
              Showing all classes for <span className="font-medium text-slate-600">{teacherName}</span>
            </p>
          )}
        </div>

        {error && <div className="mb-5"><Alert type="error" message={error} /></div>}

        {timetable.length === 0 && !error && (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="text-slate-600 font-medium">No classes assigned yet.</p>
            <p className="text-slate-400 text-sm mt-1">Ask the admin to add your name to the timetable entries.</p>
          </div>
        )}

        {timetable.length > 0 && (
          <div className="space-y-6">

            {/* ── Today's Classes ── */}
            <div className={`card overflow-hidden border-2 ${todayClasses.length > 0 ? "border-primary-500" : "border-slate-200"}`}>
              <div className={`px-5 py-3 flex items-center justify-between ${todayClasses.length > 0 ? "bg-primary-600" : "bg-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <h3 className={`font-bold text-base ${todayClasses.length > 0 ? "text-white" : "text-slate-600"}`}>
                    Today — {todayName}
                  </h3>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${todayClasses.length > 0 ? "bg-primary-500 text-white" : "bg-slate-300 text-slate-600"}`}>
                  {todayClasses.length} class{todayClasses.length !== 1 ? "es" : ""}
                </span>
              </div>
              {todayClasses.length === 0 ? (
                <div className="px-5 py-6 text-center text-slate-400 text-sm bg-white">No classes today 🎉</div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white">
                  {todayClasses.map(entry => (
                    <div key={entry.id} className="px-5 py-4 flex items-start justify-between hover:bg-primary-50 transition">
                      <div>
                        <p className="font-semibold text-slate-800 text-base">{entry.subject}</p>
                        <p className="text-sm text-primary-600 mt-0.5">🕐 {entry.time_slot}</p>
                        <span className="inline-block mt-1.5 bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {entry.course_name}
                        </span>
                      </div>
                      <span className="text-2xl mt-1">📖</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Full Week ── */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Full Week Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeDays.map(day => (
                  <div key={day} className={`card overflow-hidden ${day === todayName ? "ring-2 ring-primary-400" : ""}`}>
                    <div className={`px-5 py-3 flex items-center justify-between ${day === todayName ? "bg-primary-600 text-white" : "bg-slate-800 text-white"}`}>
                      <h4 className="font-semibold text-sm">
                        {day}
                        {day === todayName && (
                          <span className="ml-2 text-xs bg-white text-primary-600 px-1.5 py-0.5 rounded-full font-bold">TODAY</span>
                        )}
                      </h4>
                      <span className="text-xs opacity-70">{grouped[day].length} class{grouped[day].length !== 1 ? "es" : ""}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {grouped[day].map(entry => (
                        <div key={entry.id} className="px-4 py-3 hover:bg-slate-50 transition">
                          <p className="font-medium text-slate-800 text-sm">{entry.subject}</p>
                          <p className="text-xs text-primary-600 mt-0.5">🕐 {entry.time_slot}</p>
                          <p className="text-xs text-slate-400 mt-0.5">📚 {entry.course_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="card p-4 border-l-4 border-primary-500">
                <p className="text-xs text-slate-500 font-medium">Total Classes/Week</p>
                <p className="text-2xl font-bold text-slate-800">{timetable.length}</p>
              </div>
              <div className="card p-4 border-l-4 border-green-500">
                <p className="text-xs text-slate-500 font-medium">Active Days</p>
                <p className="text-2xl font-bold text-slate-800">{activeDays.length}</p>
              </div>
              <div className="card p-4 border-l-4 border-purple-500">
                <p className="text-xs text-slate-500 font-medium">Courses Teaching</p>
                <p className="text-2xl font-bold text-slate-800">{new Set(timetable.map(e => e.course_id)).size}</p>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Timetable() {
  const { user, isAdmin, isStudent, isTeacher } = useAuth()

  const [courses, setCourses]                   = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [timetable, setTimetable]               = useState([])
  const [loading, setLoading]                   = useState(false)
  const [courseLoading, setCourseLoading]       = useState(true)
  const [submitting, setSubmitting]             = useState(false)
  const [error, setError]                       = useState("")
  const [success, setSuccess]                   = useState("")
  const [deleteConfirmId, setDeleteConfirmId]   = useState(null)
  const [form, setForm]                         = useState(EMPTY_FORM)
  const [subjects, setSubjects]                 = useState([])
  const [teachers, setTeachers]                 = useState([])
  const [studentCourse, setStudentCourse]       = useState(null)

  useEffect(() => { loadCourses(); loadTeachers() }, [])

  useEffect(() => {
    if (isStudent && user?.student_id) loadStudentCourse()
  }, [isStudent, user])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function loadTeachers() {
    try {
      const res = await getTeachersAPI()
      setTeachers(res.data.teachers || [])
    } catch { /* non-critical */ }
  }

  async function loadSubjects(courseId) {
    if (!courseId) { setSubjects([]); return }
    try {
      const res = await getSubjectsByCourseAPI(courseId)
      setSubjects(res.data.subjects || [])
    } catch { setSubjects([]) }
  }

  async function loadCourses() {
    try {
      const res = await getCoursesAPI()
      setCourses(res.data.courses || [])
    } catch { setError("Failed to load courses") }
    finally { setCourseLoading(false) }
  }

  async function loadStudentCourse() {
    try {
      const res = await getStudentAPI(user.student_id)
      const courseName = res.data?.course
      if (!courseName) return
      const coursesRes = await getCoursesAPI()
      const allCourses = coursesRes.data.courses || []
      const matched = allCourses.find((c) => c.name === courseName)
      if (matched) { setStudentCourse(matched); fetchTimetable(matched.id) }
    } catch { setError("Failed to load your course") }
  }

  async function fetchTimetable(courseId) {
    if (!courseId) return
    setLoading(true); setError("")
    try {
      const res = await getTimetableByCourseAPI(courseId)
      setTimetable(res.data.timetable || [])
    } catch { setError("Failed to load timetable") }
    finally { setLoading(false) }
  }

  function handleCourseChange(e) {
    const id = e.target.value
    setSelectedCourseId(id); setTimetable([]); setError(""); setSuccess("")
    setDeleteConfirmId(null); setForm(EMPTY_FORM); loadSubjects(id)
    if (id) fetchTimetable(id)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!selectedCourseId) { setError("Select a course first"); return }
    if (!form.subject.trim() || !form.teacher.trim() || !form.time_slot.trim()) {
      setError("All fields are required"); return
    }
    setSubmitting(true); setError(""); setSuccess("")
    try {
      await addTimetableAPI({
        course_id: parseInt(selectedCourseId),
        day: form.day,
        subject: form.subject.trim(),
        teacher: form.teacher.trim(),
        time_slot: form.time_slot.trim(),
      })
      setSuccess("Entry added!")
      setForm(EMPTY_FORM)
      fetchTimetable(selectedCourseId)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add entry")
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id) {
    try {
      await deleteTimetableAPI(id)
      setSuccess("Entry deleted!"); setDeleteConfirmId(null)
      fetchTimetable(selectedCourseId)
    } catch { setError("Delete failed"); setDeleteConfirmId(null) }
  }

  const selectedCourseName = courses.find((c) => c.id === parseInt(selectedCourseId))?.name || ""

  // ── Teacher view ─────────────────────────────────────────────────────────────
  if (isTeacher) return <TeacherTimetable />

  // ── Student view ─────────────────────────────────────────────────────────────
  if (isStudent) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="page-main">
          <h2 className="text-xl font-bold text-slate-800 mb-6">🗓️ My Timetable</h2>

          {!studentCourse && !courseLoading && (
            <div className="mb-5">
              <Alert type="warning" message="No course assigned to your profile. Please contact admin." />
            </div>
          )}

          {studentCourse && (
            <div className="mb-5">
              <span className="badge badge-blue">{studentCourse.name}</span>
            </div>
          )}

          {error && <div className="mb-4"><Alert type="error" message={error} /></div>}

          {loading ? (
            <LoadingState message="Loading timetable..." />
          ) : studentCourse ? (
            <TimetableGrid
              timetable={timetable} isAdmin={false}
              onDelete={null} deleteConfirmId={null} setDeleteConfirmId={() => {}}
            />
          ) : null}
        </main>
      </div>
    )
  }

  // ── Admin / Staff view ───────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <h2 className="text-xl font-bold text-slate-800 mb-6">🗓️ Timetable</h2>

        {/* Course Selector */}
        <div className="card p-5 mb-6">
          <label className="form-label">Select Course</label>
          {courseLoading ? (
            <p className="text-sm text-slate-400">Loading courses...</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-orange-500">No courses found. <a href="/courses" className="underline">Add courses first.</a></p>
          ) : (
            <select value={selectedCourseId} onChange={handleCourseChange} className="inp max-w-xs">
              <option value="">— Select a course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.duration ? ` (${c.duration})` : ""}</option>
              ))}
            </select>
          )}
        </div>

        {/* Admin: Add Entry Form */}
        {isAdmin && selectedCourseId && (
          <div className="card p-5 mb-6 border-l-4 border-primary-400">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Add Entry — <span className="text-primary-600">{selectedCourseName}</span>
            </h3>
            <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
                className="inp"
              >
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              {subjects.length > 0 ? (
                <select
                  value={form.subject}
                  onChange={(e) => {
                    const subjectName = e.target.value
                    const matched = subjects.find((s) => s.name === subjectName)
                    let autoTeacher = form.teacher
                    if (matched?.teacher_id) {
                      const t = teachers.find((t) => t.id === matched.teacher_id)
                      if (t) autoTeacher = t.name
                    }
                    setForm({ ...form, subject: subjectName, teacher: autoTeacher })
                  }}
                  className="inp flex-1 min-w-[140px]"
                >
                  <option value="">— Select Subject —</option>
                  {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              ) : (
                <input
                  type="text" placeholder="Subject" value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="inp flex-1 min-w-[140px]"
                />
              )}

              {teachers.length > 0 ? (
                <select
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  className="inp flex-1 min-w-[160px]"
                >
                  <option value="">— Select Teacher —</option>
                  {teachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              ) : (
                <input
                  type="text" placeholder="Teacher name" value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  className="inp flex-1 min-w-[140px]"
                />
              )}

              <input
                type="text" placeholder="e.g. 9:00 - 10:00 AM" value={form.time_slot}
                onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                className="inp flex-1 min-w-[160px]"
              />
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Adding..." : "Add Entry"}
              </button>
            </form>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            {success && <p className="text-green-600 text-sm mt-3">{success}</p>}
          </div>
        )}

        {!isAdmin && error && <div className="mb-4"><Alert type="error" message={error} /></div>}
        {!isAdmin && success && <div className="mb-4"><Alert type="success" message={success} /></div>}

        {/* Prompt to select course */}
        {!selectedCourseId && !courseLoading && (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="text-slate-400">Select a course above to view its timetable.</p>
          </div>
        )}

        {/* Timetable Grid */}
        {selectedCourseId && (
          loading ? (
            <LoadingState message="Loading timetable..." />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500 font-medium">
                  Timetable for <span className="text-slate-800 font-semibold">{selectedCourseName}</span>
                </p>
                <span className="text-xs text-slate-400">{timetable.length} entr{timetable.length !== 1 ? "ies" : "y"}</span>
              </div>
              <TimetableGrid
                timetable={timetable} isAdmin={isAdmin}
                onDelete={handleDelete}
                deleteConfirmId={deleteConfirmId}
                setDeleteConfirmId={setDeleteConfirmId}
              />
            </>
          )
        )}

      </main>
    </div>
  )
}
