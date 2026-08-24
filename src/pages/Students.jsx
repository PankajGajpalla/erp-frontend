import { useEffect, useMemo, useState, useRef } from "react"
import Sidebar from "../components/Sidebar"
import ReportCardModal from "../components/ReportCardModal"
import { LoadingState, Alert, EmptyState } from "../components/UI"
import * as XLSX from "xlsx"
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
  sendStudentWhatsAppAPI,
  bulkSendWhatsAppReportAPI,
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
  inst1_date: "", inst1_amount: "",
  inst2_date: "", inst2_amount: "",
  inst3_date: "", inst3_amount: "",
  inst4_date: "", inst4_amount: "",
  inst5_date: "", inst5_amount: "",
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
  const [additionalCourseIds, setAdditionalCourseIds] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkCourse, setBulkCourse] = useState("")
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [loginModal, setLoginModal] = useState(null)
  const [loginCreds, setLoginCreds] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: "", password: "", showPass: false })
  const [loginError, setLoginError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState("")
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const formRef = useRef(null)
  const fileInputRef = useRef(null)
  const [sendingReport, setSendingReport]   = useState(false)
  const [bulkSending, setBulkSending]       = useState(false)
  const [reportResult, setReportResult]     = useState(null) // { success, message }
  const [bulkResult, setBulkResult]         = useState(null) // { sent, failed, total }

  useEffect(() => { fetchStudents(); fetchCourses() }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

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
      inst1_date: form.inst1_date || null, inst1_amount: form.inst1_amount !== "" ? parseFloat(form.inst1_amount) : null,
      inst2_date: form.inst2_date || null, inst2_amount: form.inst2_amount !== "" ? parseFloat(form.inst2_amount) : null,
      inst3_date: form.inst3_date || null, inst3_amount: form.inst3_amount !== "" ? parseFloat(form.inst3_amount) : null,
      inst4_date: form.inst4_date || null, inst4_amount: form.inst4_amount !== "" ? parseFloat(form.inst4_amount) : null,
      inst5_date: form.inst5_date || null, inst5_amount: form.inst5_amount !== "" ? parseFloat(form.inst5_amount) : null,
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
      inst1_date: student.inst1_date || "", inst1_amount: student.inst1_amount ?? "",
      inst2_date: student.inst2_date || "", inst2_amount: student.inst2_amount ?? "",
      inst3_date: student.inst3_date || "", inst3_amount: student.inst3_amount ?? "",
      inst4_date: student.inst4_date || "", inst4_amount: student.inst4_amount ?? "",
      inst5_date: student.inst5_date || "", inst5_amount: student.inst5_amount ?? "",
    })
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

  async function handleSendReport(studentId) {
    setSendingReport(true)
    setReportResult(null)
    try {
      const r = await sendStudentWhatsAppAPI(studentId)
      setReportResult({ success: true, message: r.data.message })
    } catch (err) {
      setReportResult({ success: false, message: err.response?.data?.detail || "Failed to send report" })
    } finally {
      setSendingReport(false)
    }
  }

  async function handleBulkSendReport(course) {
    if (!course) return
    setBulkSending(true)
    setBulkResult(null)
    try {
      const r = await bulkSendWhatsAppReportAPI(course)
      setBulkResult(r.data)
    } catch (err) {
      setBulkResult({ error: err.response?.data?.detail || "Bulk send failed" })
    } finally {
      setBulkSending(false)
    }
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
    const today = new Date().toISOString().split("T")[0]
    const rows = filtered.map(s => ({
      "Student Code": s.student_code || s.id,
      "Name": s.name,
      "Father Name": s.father_name || "",
      "Course": s.course || "",
      "Email": s.email || "",
      "Phone": s.phone || "",
      "Parent Phone": s.parent_phone || "",
      "Medium": s.medium || "",
      "Admission Date": s.admission_date || "",
      "Total Fees": s.fees || "",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Students")
    XLSX.writeFile(wb, `Students_Export_${today}.xlsx`)
  }

  const uniqueCourses = [...new Set(students.map((s) => s.course).filter(Boolean))]
  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Students</h2>
          <button onClick={exportToExcel} className="btn-success">
            ⬇ Export Excel
          </button>
        </div>

        {/* ── ADD / EDIT FORM ── */}
        <div ref={formRef} className="card p-6 mb-6">
          <h3 className="section-title mb-5 pb-2 border-b border-slate-100">
            {editId ? "Edit Student" : "Add New Student"}
          </h3>

          <form onSubmit={handleSubmit}>

            {/* Row: Photo + Personal Info */}
            <div className="flex gap-6 mb-5">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2 min-w-[130px]">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-32 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition overflow-hidden"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-3xl text-slate-300">📷</span>
                      <span className="text-xs text-slate-400 mt-1 text-center px-1">Click to upload photo</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <span className="text-xs text-slate-400">Max 2MB (optional)</span>
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
                <label className="form-label">Permanent Address</label>
                <textarea
                  name="permanent_address" value={form.permanent_address} onChange={handleChange}
                  placeholder="Village / Town, District, State, PIN" rows={2}
                  className="inp resize-none"
                />
              </div>
              <div>
                <label className="form-label">Local Address</label>
                <textarea
                  name="local_address" value={form.local_address} onChange={handleChange}
                  placeholder="Current / local address" rows={2}
                  className="inp resize-none"
                />
              </div>
            </div>

            {/* Academic Info */}
            <SectionTitle>Academic Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              <Field label="School / College Name" name="school_college_name" value={form.school_college_name} onChange={handleChange} placeholder="Name of school or college" />
              <div>
                <label className="form-label">Course *</label>
                <select name="course" value={form.course} onChange={handleChange} className="inp bg-white">
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
                <label className="form-label">Medium *</label>
                <select name="medium" value={form.medium} onChange={handleChange} className="inp bg-white">
                  <option value="">Select medium</option>
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                </select>
              </div>
            </div>

            {/* Fee Instalments */}
            <SectionTitle>Fee Instalments (Optional)</SectionTitle>
            <div className="mb-5 space-y-3">
              <p className="text-xs text-slate-400 -mt-3">Enter instalment schedule — date and amount for each instalment.</p>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="flex gap-3 items-center">
                  <span className="text-xs font-semibold text-slate-500 w-20 flex-shrink-0">Inst. {n}</span>
                  <input
                    type="date"
                    className="inp flex-1"
                    value={form[`inst${n}_date`]}
                    onChange={e => setForm(p => ({ ...p, [`inst${n}_date`]: e.target.value }))}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount (₹)"
                    className="inp flex-1"
                    value={form[`inst${n}_amount`]}
                    onChange={e => setForm(p => ({ ...p, [`inst${n}_amount`]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Additional Courses */}
            {courses.length > 0 && (
              <>
                <SectionTitle>Additional Courses (Optional)</SectionTitle>
                <div className="mb-5">
                  <p className="text-xs text-slate-400 mb-2">
                    Select extra courses this student is enrolled in alongside their primary course.
                    {form.course && <span className="ml-1 text-primary-500">Primary: <strong>{form.course}</strong></span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {courses
                      .filter((c) => c.name !== form.course)
                      .map((c) => {
                        const checked = additionalCourseIds.includes(c.id)
                        return (
                          <label key={c.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition select-none
                              ${checked
                                ? "bg-indigo-100 border-indigo-400 text-indigo-700"
                                : "bg-slate-50 border-slate-300 text-slate-600 hover:border-indigo-300"}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleAdditionalCourse(c.id)} className="w-3.5 h-3.5 accent-indigo-600" />
                            {c.name}
                          </label>
                        )
                      })}
                    {courses.filter((c) => c.name !== form.course).length === 0 && (
                      <p className="text-xs text-slate-400">No other courses available.</p>
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

            {error && <Alert type="error" message={error} className="mb-4" />}
            {success && <Alert type="success" message={success} className="mb-4" />}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary px-8">
                {submitting ? "Saving..." : editId ? "Update Student" : "Add Student"}
              </button>
              {editId && (
                <button type="button" onClick={handleCancel} className="btn-ghost">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* ── SEARCH & FILTER ── */}
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by name, email, course, school..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="inp flex-1"
            />
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="inp w-auto">
              <option value="all">All Courses</option>
              {uniqueCourses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => { setSearch(""); setCourseFilter("all") }} className="btn-ghost">Clear</button>
            <span className="text-sm text-slate-400">{filtered.length} of {students.length} students</span>
            {courseFilter !== "all" && (
              <button
                onClick={() => handleBulkSendReport(courseFilter)}
                disabled={bulkSending}
                className="btn bg-green-500 hover:bg-green-600 text-white text-sm disabled:opacity-50 whitespace-nowrap"
              >
                {bulkSending ? "Sending…" : `📲 Send Report to ${courseFilter}`}
              </button>
            )}
          </div>
          {bulkResult && (
            <div className={`mx-4 mb-3 px-4 py-2 rounded-lg text-sm ${bulkResult.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {bulkResult.error ? `❌ ${bulkResult.error}` : (
                <>✅ Sent to {bulkResult.sent}/{bulkResult.total} parents.
                  {bulkResult.failed?.length > 0 && (
                    <span className="ml-2 text-orange-600">
                      Failed: {bulkResult.failed.map(f => f.name).join(", ")}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── STUDENT TABLE ── */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8"><LoadingState message="Loading students…" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="🎓" title="No students found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl min-w-[800px]">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" onChange={toggleSelectAll}
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        className="cursor-pointer" />
                    </th>
                    <th>ID</th>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Father Name</th>
                    <th>Course</th>
                    <th>Medium</th>
                    <th>Mobile</th>
                    <th>Fees</th>
                    <th>Admission</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s) => (
                    <tr key={s.id} className={selectedIds.has(s.id) ? "!bg-primary-50" : ""}>
                      <td className="text-center">
                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="cursor-pointer" />
                      </td>
                      <td>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono font-semibold">
                          {s.student_code || `#${s.id}`}
                        </span>
                      </td>
                      <td>
                        {s.photo ? (
                          <img src={s.photo} alt={s.name} className="w-9 h-10 rounded object-cover border border-slate-200" />
                        ) : (
                          <div className="w-9 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs border border-slate-200">N/A</div>
                        )}
                      </td>
                      <td>
                        <div className="font-medium text-slate-800">{s.name}</div>
                        <div className="text-xs text-slate-400">{s.email}</div>
                      </td>
                      <td>{s.father_name || "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {s.course
                            ? <span className="badge-blue">{s.course}</span>
                            : <span className="text-slate-400">—</span>}
                          {(s.additional_courses || []).map((ac) => (
                            <span key={ac.id} className="badge badge-purple" title="Additional Course">+{ac.name}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {s.medium
                          ? <span className={`badge ${s.medium === "hindi" ? "bg-orange-100 text-orange-700" : "badge-green"}`}>
                              {s.medium.charAt(0).toUpperCase() + s.medium.slice(1)}
                            </span>
                          : "—"}
                      </td>
                      <td>{s.phone || "—"}</td>
                      <td className="font-medium">{s.fees ? `₹${s.fees.toLocaleString()}` : "—"}</td>
                      <td className="text-xs">{s.admission_date || "—"}</td>
                      <td>
                        {deleteConfirmId === s.id ? (
                          <div className="flex gap-1 items-center">
                            <span className="text-xs text-red-600 font-medium">Delete?</span>
                            <button onClick={() => handleDelete(s.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs">No</button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => setViewStudent(s)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs">View</button>
                            <button onClick={() => handleEdit(s)} className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs">Edit</button>
                            <button onClick={() => handleManageLogin(s)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded text-xs">🔑 Login</button>
                            <button onClick={() => setDeleteConfirmId(s.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">Delete</button>
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
          <div className="flex items-center justify-between mt-4 card px-5 py-3">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30">‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…")
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === "…"
                  ? <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                  : <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-sm font-medium transition ${page === p ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                      {p}
                    </button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 rounded text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30">Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30">»</button>
            </div>
          </div>
        )}

        {/* ── BULK PROMOTE BAR ── */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 z-40">
            <span className="text-sm font-medium">{selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected</span>
            <select value={bulkCourse} onChange={e => setBulkCourse(e.target.value)}
              className="bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              <option value="">Select new course…</option>
              {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleBulkPromote} disabled={bulkSubmitting || !bulkCourse}
              className="btn-primary disabled:opacity-50">
              {bulkSubmitting ? "Updating…" : "Move to Course"}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
          </div>
        )}

        {/* ── STUDENT DETAIL MODAL ── */}
        {viewStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setViewStudent(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-800">Student Details</h3>
                <button onClick={() => setViewStudent(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
              </div>

              <div className="flex gap-4 mb-5">
                {viewStudent.photo ? (
                  <img src={viewStudent.photo} alt={viewStudent.name} className="w-24 h-28 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <div className="w-24 h-28 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">No Photo</div>
                )}
                <div>
                  {viewStudent.student_code && (
                    <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-semibold mb-1">
                      {viewStudent.student_code}
                    </span>
                  )}
                  <p className="text-lg font-bold text-slate-800">{viewStudent.name}</p>
                  <p className="text-sm text-slate-500">S/o {viewStudent.father_name || "—"}</p>
                  <p className="text-sm text-slate-500 mt-1">{viewStudent.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {viewStudent.course && <span className="badge-blue">{viewStudent.course}</span>}
                    {(viewStudent.additional_courses || []).map((ac) => (
                      <span key={ac.id} className="badge-purple" title="Additional Course">+{ac.name}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <DetailRow label="Date of Birth" value={viewStudent.dob} />
                <DetailRow label="Admission Date" value={viewStudent.admission_date} />
                <DetailRow label="Student Mobile" value={viewStudent.phone} />
                <DetailRow label="Parent Mobile" value={viewStudent.parent_phone} />
                <DetailRow label="Medium" value={viewStudent.medium ? viewStudent.medium.charAt(0).toUpperCase() + viewStudent.medium.slice(1) : "—"} />
                <DetailRow label="Fees" value={viewStudent.fees ? `₹${viewStudent.fees.toLocaleString()}` : "—"} />
                <div className="col-span-2"><DetailRow label="School / College" value={viewStudent.school_college_name} /></div>
                {(viewStudent.additional_courses || []).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400 font-medium mb-1">Additional Courses</p>
                    <div className="flex flex-wrap gap-1">
                      {(viewStudent.additional_courses || []).map((ac) => (
                        <span key={ac.id} className="badge-blue">{ac.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="col-span-2"><DetailRow label="Permanent Address" value={viewStudent.permanent_address} /></div>
                <div className="col-span-2"><DetailRow label="Local Address" value={viewStudent.local_address} /></div>
              </div>

              {/* Instalment Schedule */}
              {[1,2,3,4,5].some(n => viewStudent[`inst${n}_date`] || viewStudent[`inst${n}_amount`]) && (
                <div className="mt-4">
                  <p className="text-xs text-slate-400 font-medium mb-2">Fee Instalment Schedule</p>
                  <div className="space-y-1.5">
                    {[1,2,3,4,5].map(n => {
                      const d = viewStudent[`inst${n}_date`]
                      const a = viewStudent[`inst${n}_amount`]
                      if (!d && !a) return null
                      return (
                        <div key={n} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
                          <span className="text-slate-500 font-medium">Instalment {n}</span>
                          <span className="text-slate-700">{d || "—"}</span>
                          <span className="font-semibold text-slate-800">{a != null ? `₹${Number(a).toLocaleString("en-IN")}` : "—"}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-2 flex-wrap">
                <button onClick={() => setReportCardId(viewStudent.id)} className="btn-primary">📄 Report Card</button>
                <button
                  onClick={() => handleSendReport(viewStudent.id)}
                  disabled={sendingReport}
                  className="btn bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                >
                  {sendingReport ? "Sending…" : "📲 Send Report"}
                </button>
                <button onClick={() => { setViewStudent(null); handleEdit(viewStudent) }} className="btn bg-yellow-400 hover:bg-yellow-500 text-white">Edit</button>
                <button onClick={() => { setViewStudent(null); setReportResult(null) }} className="btn-ghost">Close</button>
              </div>
              {reportResult && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${reportResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {reportResult.success ? "✅" : "❌"} {reportResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPORT CARD MODAL ── */}
        {reportCardId && (
          <ReportCardModal studentId={reportCardId} onClose={() => setReportCardId(null)} />
        )}

        {/* Manage Login Modal */}
        {loginModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">🔑 Manage Login</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    <span className="font-medium text-slate-700">{loginModal.name}</span>
                    {loginModal.student_code && (
                      <span className="ml-2 text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{loginModal.student_code}</span>
                    )}
                  </p>
                </div>
                <button onClick={() => setLoginModal(null)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">×</button>
              </div>

              <div className="px-6 py-5">
                {loginLoading ? (
                  <LoadingState message="Loading login info…" />
                ) : (
                  <>
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm font-medium
                      ${loginCreds?.has_login ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                      <span>{loginCreds?.has_login ? "✅" : "⚠️"}</span>
                      {loginCreds?.has_login
                        ? `Login exists — Username: ${loginCreds.username}`
                        : "No login created yet for this student"}
                    </div>

                    <form onSubmit={submitManageLogin} className="space-y-3">
                      <div>
                        <label className="form-label">Username <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="Enter username (min 3 chars)"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                          className="inp" />
                      </div>
                      <div>
                        <label className="form-label">
                          New Password {loginCreds?.has_login
                            ? <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
                            : <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={loginForm.showPass ? "text" : "password"}
                            placeholder={loginCreds?.has_login ? "Leave blank to keep unchanged" : "Set a password (min 6 chars)"}
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="inp pr-14" />
                          <button type="button"
                            onClick={() => setLoginForm(f => ({ ...f, showPass: !f.showPass }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                            {loginForm.showPass ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>

                      {loginError && <Alert type="error" message={loginError} />}
                      {loginSuccess && <Alert type="success" message={loginSuccess} />}

                      <div className="flex gap-3 pt-1">
                        <button type="submit" disabled={loginSubmitting} className="btn-primary flex-1">
                          {loginSubmitting ? "Saving..." : loginCreds?.has_login ? "Update Login" : "Create Login"}
                        </button>
                        <button type="button" onClick={() => setLoginModal(null)} className="btn-ghost flex-1">Close</button>
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
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-1">{children}</p>
  )
}

function Field({ label, name, value, onChange, type = "text", placeholder = "", min }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} min={min} className="inp" />
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-slate-700">{value || "—"}</p>
    </div>
  )
}
