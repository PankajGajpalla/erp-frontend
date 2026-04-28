import { useEffect, useState, useMemo } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getExamScheduleAPI,
  createExamAPI,
  updateExamAPI,
  deleteExamAPI,
  getCoursesAPI,
  getStudentAPI,
} from "../api"

const TODAY = new Date().toISOString().split("T")[0]

const EMPTY_FORM = {
  course_id: "",
  title: "",
  subject: "",
  exam_date: "",
  exam_time: "",
  duration: "",
  total_marks: "",
  syllabus: "",
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
}

function CourseBadge({ name }) {
  if (!name) return null
  return (
    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
      {name}
    </span>
  )
}

function ActionBadge({ type }) {
  if (type === "upcoming") {
    return (
      <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
        Upcoming
      </span>
    )
  }
  return (
    <span className="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
      Past
    </span>
  )
}

function ExamCard({ exam, courseName, type, isAdmin, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId }) {
  const isPast = type === "past"
  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 p-5 flex flex-col gap-3 transition hover:shadow-md
      ${isPast ? "border-gray-200 opacity-80" : "border-blue-200"}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <CourseBadge name={courseName} />
          <ActionBadge type={type} />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit(exam)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition"
            >
              Edit
            </button>
            {deleteConfirmId === exam.id ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 font-medium">Delete?</span>
                <button
                  onClick={() => onDelete(exam.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition"
                >
                  Yes
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs transition"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirmId(exam.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Title & Subject */}
      <div>
        <h3 className={`text-base font-bold ${isPast ? "text-gray-500" : "text-gray-800"}`}>
          {exam.title}
        </h3>
        {exam.subject && (
          <p className="text-sm text-gray-500 mt-0.5">{exam.subject}</p>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <span>📅</span>
          <span className={isPast ? "text-gray-400" : "text-gray-700 font-medium"}>
            {formatDate(exam.exam_date)}
          </span>
        </div>
        {exam.exam_time && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <span>🕐</span>
            <span>{exam.exam_time}</span>
          </div>
        )}
        {exam.duration && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <span>⏱️</span>
            <span>{exam.duration}</span>
          </div>
        )}
        {exam.total_marks != null && exam.total_marks !== "" && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <span>🎯</span>
            <span>{exam.total_marks} Marks</span>
          </div>
        )}
      </div>

      {/* Syllabus */}
      {exam.syllabus && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
          <span className="font-semibold text-gray-600">Syllabus:</span> {exam.syllabus}
        </p>
      )}
    </div>
  )
}

function ExamSection({ title, exams, courses, isAdmin, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId, emptyMsg }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
        {title}
        <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
          {exams.length}
        </span>
      </h3>
      {exams.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-400 text-sm">{emptyMsg}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {exams.map((exam) => {
            const course = courses.find((c) => c.id === exam.course_id)
            return (
              <ExamCard
                key={exam.id}
                exam={exam}
                courseName={course?.name}
                type={exam.exam_date >= TODAY ? "upcoming" : "past"}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
                deleteConfirmId={deleteConfirmId}
                setDeleteConfirmId={setDeleteConfirmId}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ exam, courses, onClose, onSave, saving }) {
  const [editForm, setEditForm] = useState({
    course_id: exam.course_id ?? "",
    title: exam.title ?? "",
    subject: exam.subject ?? "",
    exam_date: exam.exam_date ?? "",
    exam_time: exam.exam_time ?? "",
    duration: exam.duration ?? "",
    total_marks: exam.total_marks ?? "",
    syllabus: exam.syllabus ?? "",
  })
  const [localError, setLocalError] = useState("")

  function handleSubmit(e) {
    e.preventDefault()
    if (!editForm.course_id || !editForm.title.trim() || !editForm.exam_date) {
      setLocalError("Course, title, and exam date are required.")
      return
    }
    setLocalError("")
    onSave(exam.id, editForm)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Edit Exam</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Course *</label>
            <select
              value={editForm.course_id}
              onChange={(e) => setEditForm({ ...editForm, course_id: e.target.value })}
              className="inp"
            >
              <option value="">— Select Course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="inp"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                className="inp"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Date *</label>
              <input
                type="date"
                value={editForm.exam_date}
                onChange={(e) => setEditForm({ ...editForm, exam_date: e.target.value })}
                className="inp"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM"
                value={editForm.exam_time}
                onChange={(e) => setEditForm({ ...editForm, exam_time: e.target.value })}
                className="inp"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
              <input
                type="text"
                placeholder="e.g. 2 Hours"
                value={editForm.duration}
                onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                className="inp"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Total Marks</label>
              <input
                type="number"
                min="0"
                value={editForm.total_marks}
                onChange={(e) => setEditForm({ ...editForm, total_marks: e.target.value })}
                className="inp"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Syllabus (optional)</label>
            <textarea
              value={editForm.syllabus}
              onChange={(e) => setEditForm({ ...editForm, syllabus: e.target.value })}
              rows={3}
              placeholder="Topics covered..."
              className="inp resize-none"
            />
          </div>
          {localError && <p className="text-red-600 text-sm">{localError}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExamSchedule() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth()

  const [courses, setCourses]                     = useState([])
  const [selectedCourseId, setSelectedCourseId]   = useState("")
  const [exams, setExams]                         = useState([])
  const [loading, setLoading]                     = useState(false)
  const [coursesLoading, setCoursesLoading]       = useState(true)
  const [error, setError]                         = useState("")
  const [success, setSuccess]                     = useState("")

  const [form, setForm]                           = useState(EMPTY_FORM)
  const [submitting, setSubmitting]               = useState(false)
  const [showAddForm, setShowAddForm]             = useState(false)

  const [editModal, setEditModal]                 = useState(null)
  const [saving, setSaving]                       = useState(false)

  const [deleteConfirmId, setDeleteConfirmId]     = useState(null)

  // Student: auto-detected course
  const [studentCourse, setStudentCourse]         = useState(null)
  const [studentLoading, setStudentLoading]       = useState(false)

  // ── Load courses on mount ─────────────────────────────────────────────────
  useEffect(() => {
    loadCourses()
  }, [])

  // ── Student: auto-detect course ───────────────────────────────────────────
  useEffect(() => {
    if (isStudent && user?.student_id) {
      loadStudentCourse()
    }
  }, [isStudent, user])

  // ── Auto-clear success msg ────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3500)
      return () => clearTimeout(t)
    }
  }, [success])

  // ── Fetch exams when selectedCourseId changes (admin/teacher) ─────────────
  useEffect(() => {
    if (isAdmin || isTeacher) {
      fetchExams(selectedCourseId || null)
    }
  }, [selectedCourseId, isAdmin, isTeacher])

  async function loadCourses() {
    try {
      const res = await getCoursesAPI()
      setCourses(res.data.courses || [])
    } catch {
      setError("Failed to load courses")
    } finally {
      setCoursesLoading(false)
    }
  }

  async function loadStudentCourse() {
    setStudentLoading(true)
    try {
      const res = await getStudentAPI(user.student_id)
      const courseName = res.data?.course
      if (!courseName) return

      const coursesRes = await getCoursesAPI()
      const allCourses = coursesRes.data.courses || []
      const matched = allCourses.find((c) => c.name === courseName)
      if (matched) {
        setStudentCourse(matched)
        fetchExams(matched.id)
      }
    } catch {
      setError("Failed to load your course information")
    } finally {
      setStudentLoading(false)
    }
  }

  async function fetchExams(courseId) {
    setLoading(true)
    setError("")
    try {
      const res = await getExamScheduleAPI(courseId)
      setExams(res.data.exams || res.data || [])
    } catch {
      setError("Failed to load exam schedule")
    } finally {
      setLoading(false)
    }
  }

  // ── Split & sort exams ────────────────────────────────────────────────────
  const { upcomingExams, pastExams } = useMemo(() => {
    const upcoming = exams
      .filter((e) => e.exam_date >= TODAY)
      .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
    const past = exams
      .filter((e) => e.exam_date < TODAY)
      .sort((a, b) => b.exam_date.localeCompare(a.exam_date))
    return { upcomingExams: upcoming, pastExams: past }
  }, [exams])

  // ── Add exam ──────────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault()
    if (!form.course_id) { setError("Please select a course"); return }
    if (!form.title.trim() || !form.exam_date) { setError("Title and exam date are required"); return }

    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      await createExamAPI({
        course_id: parseInt(form.course_id),
        title: form.title.trim(),
        subject: form.subject.trim(),
        exam_date: form.exam_date,
        exam_time: form.exam_time.trim(),
        duration: form.duration.trim(),
        total_marks: form.total_marks ? parseInt(form.total_marks) : null,
        syllabus: form.syllabus.trim(),
      })
      setSuccess("Exam added successfully!")
      setForm(EMPTY_FORM)
      setShowAddForm(false)
      fetchExams(selectedCourseId || null)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add exam")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edit exam ─────────────────────────────────────────────────────────────
  async function handleSaveEdit(examId, editForm) {
    setSaving(true)
    setError("")
    try {
      await updateExamAPI(examId, {
        course_id: parseInt(editForm.course_id),
        title: editForm.title.trim(),
        subject: editForm.subject.trim(),
        exam_date: editForm.exam_date,
        exam_time: editForm.exam_time.trim(),
        duration: editForm.duration.trim(),
        total_marks: editForm.total_marks ? parseInt(editForm.total_marks) : null,
        syllabus: editForm.syllabus.trim(),
      })
      setSuccess("Exam updated successfully!")
      setEditModal(null)
      fetchExams(selectedCourseId || null)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update exam")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete exam ───────────────────────────────────────────────────────────
  async function handleDelete(examId) {
    setDeleteConfirmId(null)
    try {
      await deleteExamAPI(examId)
      setSuccess("Exam deleted.")
      fetchExams(selectedCourseId || null)
    } catch {
      setError("Failed to delete exam")
    }
  }

  // ── Student view ──────────────────────────────────────────────────────────
  if (isStudent) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="page-main">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Exam Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">Your upcoming and past exams</p>
          </div>

          {studentLoading && (
            <div className="flex items-center gap-3 text-gray-500 mt-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading your exam schedule...
            </div>
          )}

          {!studentLoading && !studentCourse && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-yellow-700 text-sm">
              No course assigned to your profile. Please contact your administrator.
            </div>
          )}

          {studentCourse && (
            <div className="mb-5 flex items-center gap-3">
              <CourseBadge name={studentCourse.name} />
              <span className="text-sm text-gray-400">{exams.length} exam{exams.length !== 1 ? "s" : ""}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {loading && studentCourse && (
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading exams...
            </div>
          )}

          {!loading && studentCourse && (
            <>
              <ExamSection
                title="Upcoming Exams"
                exams={upcomingExams}
                courses={courses.length ? courses : studentCourse ? [studentCourse] : []}
                isAdmin={false}
                onEdit={null}
                onDelete={null}
                deleteConfirmId={null}
                setDeleteConfirmId={() => {}}
                emptyMsg="No upcoming exams scheduled."
              />
              <ExamSection
                title="Past Exams"
                exams={pastExams}
                courses={courses.length ? courses : studentCourse ? [studentCourse] : []}
                isAdmin={false}
                onEdit={null}
                onDelete={null}
                deleteConfirmId={null}
                setDeleteConfirmId={() => {}}
                emptyMsg="No past exams recorded."
              />
            </>
          )}
        </main>
      </div>
    )
  }

  // ── Teacher view ──────────────────────────────────────────────────────────
  if (isTeacher) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="page-main">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Exam Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">View exam schedules by course</p>
          </div>

          {/* Course Filter */}
          <div className="card p-5 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Course</label>
            {coursesLoading ? (
              <p className="text-sm text-gray-400">Loading courses...</p>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="inp max-w-xs"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading exams...
            </div>
          ) : (
            <>
              <ExamSection
                title="Upcoming Exams"
                exams={upcomingExams}
                courses={courses}
                isAdmin={false}
                onEdit={null}
                onDelete={null}
                deleteConfirmId={null}
                setDeleteConfirmId={() => {}}
                emptyMsg="No upcoming exams scheduled."
              />
              <ExamSection
                title="Past Exams"
                exams={pastExams}
                courses={courses}
                isAdmin={false}
                onEdit={null}
                onDelete={null}
                deleteConfirmId={null}
                setDeleteConfirmId={() => {}}
                emptyMsg="No past exams recorded."
              />
            </>
          )}
        </main>
      </div>
    )
  }

  // ── Admin view ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Exam Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">Manage exam schedules across all courses</p>
          </div>
          <button
            onClick={() => { setShowAddForm((v) => !v); setError("") }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <span className="text-base">{showAddForm ? "✕" : "+"}</span>
            {showAddForm ? "Cancel" : "Add Exam"}
          </button>
        </div>

        {/* Success / Error banners */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Add Exam Form */}
        {showAddForm && (
          <div className="card p-6 mb-6 border-l-4 border-primary-400">
            <h3 className="text-base font-bold text-gray-800 mb-4">Add New Exam</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Course *</label>
                  {coursesLoading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : (
                    <select
                      value={form.course_id}
                      onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                      className="inp"
                    >
                      <option value="">— Select Course —</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Mid-Term Exam"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="inp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="inp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Exam Date *</label>
                  <input
                    type="date"
                    value={form.exam_date}
                    onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                    className="inp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={form.exam_time}
                    onChange={(e) => setForm({ ...form, exam_time: e.target.value })}
                    className="inp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Hours"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="inp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Marks</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={form.total_marks}
                    onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                    className="inp"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Syllabus (optional)</label>
                  <textarea
                    placeholder="Topics / chapters to be covered..."
                    value={form.syllabus}
                    onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
                    rows={2}
                    className="inp resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? "Adding..." : "Add Exam"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setError("") }}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Course Filter */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-semibold text-gray-700">Filter by Course:</label>
            {coursesLoading ? (
              <p className="text-sm text-gray-400">Loading courses...</p>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => { setSelectedCourseId(e.target.value); setDeleteConfirmId(null) }}
                className="inp min-w-[200px]"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {exams.length} exam{exams.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Exams Grid */}
        {loading ? (
          <div className="flex items-center gap-3 text-gray-500 mt-4">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading exams...
          </div>
        ) : (
          <>
            <ExamSection
              title="Upcoming Exams"
              exams={upcomingExams}
              courses={courses}
              isAdmin={isAdmin}
              onEdit={(exam) => { setEditModal(exam); setError("") }}
              onDelete={handleDelete}
              deleteConfirmId={deleteConfirmId}
              setDeleteConfirmId={setDeleteConfirmId}
              emptyMsg="No upcoming exams scheduled."
            />
            <ExamSection
              title="Past Exams"
              exams={pastExams}
              courses={courses}
              isAdmin={isAdmin}
              onEdit={(exam) => { setEditModal(exam); setError("") }}
              onDelete={handleDelete}
              deleteConfirmId={deleteConfirmId}
              setDeleteConfirmId={setDeleteConfirmId}
              emptyMsg="No past exams recorded."
            />
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editModal && (
        <EditModal
          exam={editModal}
          courses={courses}
          onClose={() => setEditModal(null)}
          onSave={handleSaveEdit}
          saving={saving}
        />
      )}
    </div>
  )
}
