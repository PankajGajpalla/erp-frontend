import { useEffect, useState, useRef } from "react"
import Sidebar from "../components/Sidebar"
import {
  getStudentsAPI,
  addStudentAPI,
  updateStudentAPI,
  deleteStudentAPI,
  getCoursesAPI
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
  const [filtered, setFiltered] = useState([])
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
  const formRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchStudents(); fetchCourses() }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  useEffect(() => {
    const q = search.toLowerCase()
    let result = students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.course?.toLowerCase().includes(q) ||
        s.school_college_name?.toLowerCase().includes(q) ||
        s.student_code?.toLowerCase().includes(q)
    )
    if (courseFilter !== "all") {
      result = result.filter((s) => s.course === courseFilter)
    }
    setFiltered(result)
  }, [search, students, courseFilter])

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
    const required = [
      ["name", "Student Name"],
      ["father_name", "Father Name"],
      ["dob", "Date of Birth"],
      ["email", "Email"],
      ["phone", "Student Mobile"],
      ["parent_phone", "Parent Mobile"],
      ["permanent_address", "Permanent Address"],
      ["local_address", "Local Address"],
      ["course", "Course"],
      ["fees", "Fees"],
      ["school_college_name", "School/College Name"],
      ["medium", "Medium"],
      ["admission_date", "Admission Date"],
    ]
    for (const [key, label] of required) {
      if (!form[key] || form[key].toString().trim() === "") return `${label} is required`
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format"
    if (parseFloat(form.fees) < 0) return "Fees cannot be negative"
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
      father_name: form.father_name.trim(),
      dob: form.dob,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      parent_phone: form.parent_phone.trim(),
      permanent_address: form.permanent_address.trim(),
      local_address: form.local_address.trim(),
      course: form.course.trim(),
      fees: parseFloat(form.fees),
      school_college_name: form.school_college_name.trim(),
      medium: form.medium,
      admission_date: form.admission_date,
      photo: form.photo || null,
    }

    setSubmitting(true)
    try {
      if (editId) {
        await updateStudentAPI(editId, payload)
        setSuccess("Student updated successfully!")
        setEditId(null)
      } else {
        await addStudentAPI(payload)
        setSuccess("Student added successfully!")
      }
      setForm(EMPTY_FORM)
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
    setPhotoPreview(student.photo || null)
    setError("")
    setSuccess("")
    formRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  function handleCancel() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setError("")
    setSuccess("")
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

  const uniqueCourses = [...new Set(students.map((s) => s.course).filter(Boolean))]

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Students</h2>

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
                <Field label="Father Name *" name="father_name" value={form.father_name} onChange={handleChange} placeholder="Father's full name" />
                <Field label="Date of Birth *" name="dob" value={form.dob} onChange={handleChange} type="date" />
                <Field label="Email *" name="email" value={form.email} onChange={handleChange} type="email" placeholder="student@email.com" />
              </div>
            </div>

            {/* Contact */}
            <SectionTitle>Contact Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <Field label="Student Mobile No. *" name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit mobile number" />
              <Field label="Parent Mobile No. *" name="parent_phone" value={form.parent_phone} onChange={handleChange} placeholder="10-digit mobile number" />
            </div>

            {/* Address */}
            <SectionTitle>Address</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Permanent Address *</label>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Local Address *</label>
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
              <Field label="School / College Name *" name="school_college_name" value={form.school_college_name} onChange={handleChange} placeholder="Name of school or college" />
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
              <Field label="Fees (₹) *" name="fees" value={form.fees} onChange={handleChange} type="number" min="0" placeholder="Total fees amount" />
              <Field label="Admission Date *" name="admission_date" value={form.admission_date} onChange={handleChange} type="date" />
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
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-gray-50 transition">
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
                        {s.course
                          ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{s.course}</span>
                          : "—"}
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewStudent(s)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs"
                            >View</button>
                            <button
                              onClick={() => handleEdit(s)}
                              className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                            >Edit</button>
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
                  {viewStudent.course && (
                    <span className="mt-2 inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{viewStudent.course}</span>
                  )}
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
                <div className="col-span-2">
                  <DetailRow label="Permanent Address" value={viewStudent.permanent_address} />
                </div>
                <div className="col-span-2">
                  <DetailRow label="Local Address" value={viewStudent.local_address} />
                </div>
              </div>

              <div className="mt-5 flex gap-2">
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
