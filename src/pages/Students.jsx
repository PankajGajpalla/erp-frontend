import { useEffect, useMemo, useState, useRef } from "react"
import Sidebar from "../components/Sidebar"
import ReportCardModal from "../components/ReportCardModal"
import {
  getStudentsAPI,
  addStudentAPI,
  updateStudentAPI,
  deleteStudentAPI,
  getCoursesAPI,
  bulkUpdateCourseAPI,
  setStudentAdditionalCoursesAPI,
  getStudentCredentialsAPI,
  updateStudentCredentialsAPI,
} from "../api"

const EMPTY_FORM = {
  name: "",
  father_name: "",
  dob: "",
  email: "",
  phone: "",
  parent_phone: "",
  permanent_address: "",
  local_address: "",
  course: "",
  fees: "",
  school_college_name: "",
  medium: "",
  admission_date: "",
  photo: "",
}

export default function Students() {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [viewStudent, setViewStudent] = useState(null)
  const [reportCardId, setReportCardId] = useState(null)
  // Additional courses for current edit/add
  const [additionalCourseIds, setAdditionalCourseIds] = useState([])
  // Bulk promote
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkCourse, setBulkCourse] = useState("")
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  // Pagination
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  // Login management
  const [loginModal, setLoginModal] = useState(null)
  const [loginCreds, setLoginCreds] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: "", password: "", showPass: false })
  const [loginError, setLoginError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState("")
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const formRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchStudents(); fetchCourses() }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  // Close detail modal on Escape key
  useEffect(() => {
    if (!viewStudent && !reportCardId) return
    function onKey(e) {
      if (e.key === "Escape") {
        setViewStudent(null)
        setReportCardId(null)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [viewStudent, reportCardId])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter((s) => {
      const matchText =
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.course?.toLowerCase().includes(q) ||
        s.school_college_name?.toLowerCase().includes(q) ||
        s.student_code?.toLowerCase().includes(q)
      const matchCourse = courseFilter === "all" || s.course === courseFilter
      return matchText && matchCourse
    })
  }, [search, students, courseFilter])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [search, courseFilter])

  async function fetchStudents() {
    try {
      const res = await getStudentsAPI()
      setStudents(res.data.students)
    } catch {
      setError("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  async function fetchCourses() {
    try {
      const res = await getCoursesAPI()
      setCourses(res.data.courses)
    } catch {
      // non-fatal
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError("")
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be less than 2MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setForm((f) => ({ ...f, photo: reader.result }))
      setPhotoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function validateForm() {
    if (!form.name?.trim()) return "Student Name is required"
    if (!form.phone?.trim()) return "Student Mobile is required"
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format"
    if (form.fees !== "" && form.fees !== null && isNaN(parseFloat(form.fees))) return "Fees must be a number"
    if (form.fees !== "" && form.fees !== null && parseFloat(form.fees) < 0) return "Fees cannot be negative"
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const err = validateForm()
    if (err) { setError(err); return }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      father_name: form.father_name?.trim() || null,
      dob: form.dob || null,
      email: form.email?.trim().toLowerCase() || null,
      parent_phone: form.parent_phone?.trim() || null,
      permanent_address: form.permanent_address?.trim() || null,
      local_address: form.local_address?.trim() || null,
      course: form.course?.trim() || null,
      fees: form.fees !== "" && form.fees !== null ? parseFloat(form.fees) : null,
      school_college_name: form.school_college_name?.trim() || null,
      medium: form.medium || null,
      admission_date: form.admission_date || null,
      photo: form.photo || null,
    }

    setSubmitting(true)
    try {
      let savedId = editId
      if (editId) {
        await updateStudentAPI(editId, payload)
        setSuccess("Student updated successfully!")
        setEditId(null)
      } else {
        const res = await addStudentAPI(payload)
        savedId = res.data.student?.id
        setSuccess("Student added successfully!")
      }
      // Save additional courses
      if (savedId) {
        await setStudentAdditionalCoursesAPI(savedId, { course_ids: additionalCourseIds })
      }
      setForm(EMPTY_FORM)
      setAdditionalCourseIds([])
      setPhotoPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      fetchStudents()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(", "))
      } else {
        setError(detail || "Something went wrong")
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(student) {
    setEditId(student.id)
    setForm({
      name: student.name || "",
      father_name: student.father_name || "",
      dob: student.dob || "",
      email: student.email || "",
      phone: student.phone || "",
      parent_phone: student.parent_phone || "",
      permanent_address: student.permanent_address || "",
      local_address: student.local_address || "",
      course: student.course || "",
      fees: student.fees || "",
      school_college_name: student.school_college_name || "",
      medium: student.medium || "",
      admission_date: student.admission_date || "",
      photo: student.photo || "",
    })
    // Pre-populate additional courses from existing student data
    setAdditionalCourseIds((student.additional_courses || []).map((c) => c.id))
    setPhotoPreview(student.photo || null)
    setError("")
    setSuccess("")
    formRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  function handleCancel() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setAdditionalCourseIds([])
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setError("")
    setSuccess("")
  }

  function toggleAdditionalCourse(courseId) {
    setAdditionalCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    )
  }

  async function handleDelete(id) {
    try {
      await deleteStudentAPI(id)
      setSuccess("Student deleted!")
      setDeleteConfirmId(null)
      fetchStudents()
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed")
      setDeleteConfirmId(null)
    }
  }

  async function handleManageLogin(student) {
    setLoginModal(student)
    setLoginError("")
    setLoginSuccess("")
    setLoginLoading(true)
    setLoginCreds(null)
    setLoginForm({ username: "", password: "", showPass: false })
    try {
      const res = await getStudentCredentialsAPI(student.id)
      setLoginCreds(res.data)
      setLoginForm({ username: res.data.username || "", password: "", showPass: false })
    } catch {
      setLoginError("Failed to load login info")
    } finally {
      setLoginLoading(false)
    }
  }

  async function submitManageLogin(e) {
    e.preventDefault()
    setLoginError("")
    setLoginSuccess("")
    if (!loginForm.username.trim()) { setLoginError("Username is required"); return }
    if (loginForm.username.trim().length < 3) { setLoginError("Username must be at least 3 characters"); return }
    if (!loginCreds?.has_login && !loginForm.password) { setLoginError("Password is required to create a new login"); return }
    if (loginForm.password && loginForm.password.length < 6) { setLoginError("Password must be at least 6 characters"); return }
    setLoginSubmitting(true)
    try {
      const res = await updateStudentCredentialsAPI(loginModal.id, {
        username: loginForm.username.trim(),
        password: loginForm.password || undefined,
      })
      setLoginSuccess(res.data.message)
      setLoginCreds({ has_login: true, username: loginForm.username.trim() })
      setLoginForm(f => ({ ...f, password: "" }))
    } catch (err) {
      setLoginError(err.response?.data?.detail || "Failed to update login")
    } finally {
      setLoginSubmitting(false)
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(s => s.id)))
  }

  async function handleBulkPromote() {
    if (!bulkCourse) { setError("Select a course to assign"); return }
    if (selectedIds.size === 0) return
    setBulkSubmitting(true)
    try {
      await bulkUpdateCourseAPI({ student_ids: [...selectedIds], course: bulkCourse })
      setSuccess(`${selectedIds.size} student(s) moved to "${bulkCourse}"`)
      setSelectedIds(new Set())
      setBulkCourse("")
      fetchStudents()
    } catch { setError("Bulk update failed") }
    finally { setBulkSubmitting(false) }
  }

  function exportToExcel() {
    import("xlsx").then(XLSX => {
      const rows = students.map(s => ({
        "Student ID": s.student_code || s.id,
        "Name": s.name,
        "Father Name": s.father_name || "",
        "DOB": s.dob || "",
        "Email": s.email || "",
        "Phone": s.phone || "",
        "Parent Phone": s.parent_phone || "",
        "Course": s.course || "",
        "Medium": s.medium || "",
        "School/College": s.school_college_name || "",
        "Admission Date": s.admission_date || "",
        "Fees": s.fees || "",
        "Permanent Address": s.permanent_address || "",
        "Local Address": s.local_address || "",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Students")
      XLSX.writeFile(wb, "students_export.xlsx")
    })
  }

  const uniqueCourses = [...new Set(students.map((s) => s.course).filter(Boolean))]
  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Students</h2>
          <button onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            ⬇ Export Excel
          </button>
        </div>

        {/* ── ADD / EDIT FORM ── */}
        <div ref={formRef} className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-5 pb-2 border-b">
            {editId ? "Edit Student" : "Add New Student"}
          </h3>

          <form onSubmit={handleSubmit}>

            {/* Row: Photo + Personal Info */}
            <div className="flex gap-6 mb-5">

              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2 min-w-[130px]">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition overflow-hidden"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-3xl text-gray-300">📷</span>
                      <span className="text-xs text-gray-400 mt-1 text-center px-1">Click to upload photo</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <span className="text-xs text-gray-400">Max 2MB (optional)</span>
              </div>

              {/* Personal Info */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Student Name *" name="name" value={form.name} onChange={handleChange} placeholder="Full name" />
                <Field label="Father Name" name="father_name" value={form.father_name} onChange={handleChange} placeholder="Father's full name" />
                <Field label="Date of Birth" name="dob" value={form.dob} onChange={handleChange} type="date" />
                <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="student@email.com" />
              </div>
            </div>

            {/* Contact */}
            <SectionTitle>Contact Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <Field label="Student Mobile No. *" name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit mobile number" />
              <Field label="Parent Mobile No." name="parent_phone" value={form.parent_phone} onChange={handleChange} placeholder="10-digit mobile number" />
            </div>

            {/* Address */}
            <SectionTitle>Address</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Permanent Address</label>
                <textarea
                  name="permanent_address"
                  value={form.permanent_address}
                  onChange={handleChange}
                  placeholder="Village / Town, District, State, PIN"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Local Address</label>
                <textarea
                  name="local_address"
                  value={form.local_address}
                  onChange={handleChange}
                  placeholder="Current / local address"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Academic Info */}
            <SectionTitle>Academic Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              <Field label="School / College Name" name="school_college_name" value={form.school_college_name} onChange={handleChange} placeholder="Name of school or college" />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Course *</label>
                <select
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}{c.duration ? ` (${c.duration})` : ""}</option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No courses added yet. <a href="/courses" className="underline">Add courses first.</a></p>
                )}
              </div>
              <Field label="Fees (₹)" name="fees" value={form.fees} onChange={handleChange} type="number" min="0" placeholder="Total fees amount" />
              <Field label="Admission Date" name="admission_date" value={form.admission_date} onChange={handleChange} type="date" />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Medium *</label>
                <select
                  name="medium"
                  value={form.medium}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select medium</option>
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                </select>
              </div>
            </div>

            {/* Additional Courses */}
            {courses.length > 0 && (
              <>
                <SectionTitle>Additional Courses (Optional)</SectionTitle>
                <div className="mb-5">
                  <p className="text-xs text-gray-400 mb-2">
                    Select extra courses this student is enrolled in alongside their primary course.
                    {form.course && <span className="ml-1 text-blue-500">Primary: <strong>{form.course}</strong></span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {courses
                      .filter((c) => c.name !== form.course) // hide primary course
                      .map((c) => {
                        const checked = additionalCourseIds.includes(c.id)
                        return (
                          <label key={c.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition select-none
                              ${checked
                                ? "bg-indigo-100 border-indigo-400 text-indigo-700"
                                : "bg-gray-50 border-gray-300 text-gray-600 hover:border-indigo-300"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAdditionalCourse(c.id)}
                              className="w-3.5 h-3.5 accent-indigo-600"
                            />
                            {c.name}
                          </label>
                        )
                      })}
                    {courses.filter((c) => c.name !== form.course).length === 0 && (
                      <p className="text-xs text-gray-400">No other courses available.</p>
                    )}
                  </div>
                  {additionalCourseIds.length > 0 && (
                    <p className="text-xs text-indigo-600 mt-2">
                      ✓ {additionalCourseIds.length} additional course{additionalCourseIds.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Error / Success */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : editId ? "Update Student" : "Add Student"}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── SEARCH & FILTER ── */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by name, email, course, school..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => { setSearch(""); setCourseFilter("all") }}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
            >
              Clear
            </button>
            <span className="text-sm text-gray-400">
              {filtered.length} of {students.length} students
            </span>
          </div>
        </div>

        {/* ── STUDENT TABLE ── */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Loading students...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🎓</p>
              <p className="text-gray-400">No students found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                    <th className="px-4 py-3">
                      <input type="checkbox" onChange={toggleSelectAll}
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        className="cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Photo</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Father Name</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Medium</th>
                    <th className="px-4 py-3 text-left">Mobile</th>
                    <th className="px-4 py-3 text-left">Fees</th>
                    <th className="px-4 py-3 text-left">Admission</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s) => (
                    <tr key={s.id} className={`border-t hover:bg-gray-50 transition ${selectedIds.has(s.id) ? "bg-blue-50" : ""}`}>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)} className="cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-semibold">
                          {s.student_code || `#${s.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.photo ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="w-9 h-10 rounded object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-9 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.father_name || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.course
                            ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{s.course}</span>
                            : <span className="text-gray-400">—</span>}
                          {(s.additional_courses || []).map((ac) => (
                            <span key={ac.id} className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-medium" title="Additional Course">
                              +{ac.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.medium
                          ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.medium === "hindi" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                              {s.medium.charAt(0).toUpperCase() + s.medium.slice(1)}
                            </span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.phone || "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{s.fees ? `₹${s.fees.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.admission_date || "—"}</td>
                      <td className="px-4 py-3">
                        {deleteConfirmId === s.id ? (
                          <div className="flex gap-1 items-center">
                            <span className="text-xs text-red-600 font-medium">Delete?</span>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                            >Yes</button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs"
                            >No</button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => setViewStudent(s)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs"
                            >View</button>
                            <button
                              onClick={() => handleEdit(s)}
                              className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                            >Edit</button>
                            <button
                              onClick={() => handleManageLogin(s)}
                              className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                            >🔑 Login</button>
                            <button
                              onClick={() => setDeleteConfirmId(s.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                            >Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 bg-white rounded-xl shadow px-5 py-3">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30">‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…")
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === "…"
                  ? <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                  : <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-sm font-medium transition ${page === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                      {p}
                    </button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30">Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">»</button>
            </div>
          </div>
        )}

        {/* ── BULK PROMOTE BAR ── */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 z-40">
            <span className="text-sm font-medium">{selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected</span>
            <select value={bulkCourse} onChange={e => setBulkCourse(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              <option value="">Select new course…</option>
              {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleBulkPromote} disabled={bulkSubmitting || !bulkCourse}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {bulkSubmitting ? "Updating…" : "Move to Course"}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
          </div>
        )}

        {/* ── STUDENT DETAIL MODAL ── */}
        {viewStudent && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setViewStudent(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">Student Details</h3>
                <button onClick={() => setViewStudent(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              <div className="flex gap-4 mb-5">
                {viewStudent.photo ? (
                  <img src={viewStudent.photo} alt={viewStudent.name} className="w-24 h-28 rounded-lg object-cover border" />
                ) : (
                  <div className="w-24 h-28 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border">No Photo</div>
                )}
                <div>
                  {viewStudent.student_code && (
                    <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono font-semibold mb-1">
                      {viewStudent.student_code}
                    </span>
                  )}
                  <p className="text-lg font-bold text-gray-800">{viewStudent.name}</p>
                  <p className="text-sm text-gray-500">S/o {viewStudent.father_name || "—"}</p>
                  <p className="text-sm text-gray-500 mt-1">{viewStudent.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {viewStudent.course && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{viewStudent.course}</span>
                    )}
                    {(viewStudent.additional_courses || []).map((ac) => (
                      <span key={ac.id} className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full text-xs font-medium" title="Additional Course">
                        +{ac.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailRow label="Date of Birth" value={viewStudent.dob} />
                <DetailRow label="Admission Date" value={viewStudent.admission_date} />
                <DetailRow label="Student Mobile" value={viewStudent.phone} />
                <DetailRow label="Parent Mobile" value={viewStudent.parent_phone} />
                <DetailRow label="Medium" value={viewStudent.medium ? viewStudent.medium.charAt(0).toUpperCase() + viewStudent.medium.slice(1) : "—"} />
                <DetailRow label="Fees" value={viewStudent.fees ? `₹${viewStudent.fees.toLocaleString()}` : "—"} />
                <div className="col-span-2">
                  <DetailRow label="School / College" value={viewStudent.school_college_name} />
                </div>
                {(viewStudent.additional_courses || []).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 font-medium mb-1">Additional Courses</p>
                    <div className="flex flex-wrap gap-1">
                      {(viewStudent.additional_courses || []).map((ac) => (
                        <span key={ac.id} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">
                          {ac.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="col-span-2">
                  <DetailRow label="Permanent Address" value={viewStudent.permanent_address} />
                </div>
                <div className="col-span-2">
                  <DetailRow label="Local Address" value={viewStudent.local_address} />
                </div>
              </div>

              <div className="mt-5 flex gap-2 flex-wrap">
                <button onClick={() => setReportCardId(viewStudent.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                  📄 Report Card
                </button>
                <button
                  onClick={() => { setViewStudent(null); handleEdit(viewStudent) }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm"
                >Edit</button>
                <button
                  onClick={() => setViewStudent(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
                >Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORT CARD MODAL ── */}
        {reportCardId && (
          <ReportCardModal studentId={reportCardId} onClose={() => setReportCardId(null)} />
        )}

        {/* Manage Login Modal */}
        {loginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">🔑 Manage Login</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="font-medium text-gray-700">{loginModal.name}</span>
                    {loginModal.student_code && (
                      <span className="ml-2 text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{loginModal.student_code}</span>
                    )}
                  </p>
                </div>
                <button onClick={() => setLoginModal(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
              </div>

              <div className="px-6 py-5">
                {loginLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4 justify-center">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading login info...
                  </div>
                ) : (
                  <>
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm font-medium
                      ${loginCreds?.has_login ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                      <span>{loginCreds?.has_login ? "✅" : "⚠️"}</span>
                      {loginCreds?.has_login
                        ? `Login exists — Username: ${loginCreds.username}`
                        : "No login created yet for this student"}
                    </div>

                    <form onSubmit={submitManageLogin} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input type="text" placeholder="Enter username (min 3 chars)"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          New Password {loginCreds?.has_login
                            ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                            : <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={loginForm.showPass ? "text" : "password"}
                            placeholder={loginCreds?.has_login ? "Leave blank to keep unchanged" : "Set a password (min 6 chars)"}
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12" />
                          <button type="button"
                            onClick={() => setLoginForm(f => ({ ...f, showPass: !f.showPass }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                            {loginForm.showPass ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>

                      {loginError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                          <p className="text-red-600 text-sm">{loginError}</p>
                        </div>
                      )}
                      {loginSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                          <p className="text-green-600 text-sm">{loginSuccess}</p>
                        </div>
                      )}

                      <div className="flex gap-3 pt-1">
                        <button type="submit" disabled={loginSubmitting}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50">
                          {loginSubmitting ? "Saving..." : loginCreds?.has_login ? "Update Login" : "Create Login"}
                        </button>
                        <button type="button" onClick={() => setLoginModal(null)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-sm transition">
                          Close
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

// ── Small reusable components ──────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-1">{children}</p>
  )
}

function Field({ label, name, value, onChange, type = "text", placeholder = "", min }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-gray-700">{value || "—"}</p>
    </div>
  )
}
