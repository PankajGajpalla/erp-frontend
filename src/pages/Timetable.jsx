import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getTimetableAPI, addTimetableAPI, deleteTimetableAPI } from "../api"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function Timetable() {
  const { user, isAdmin } = useAuth()

  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const [form, setForm] = useState({
    day: "Monday",
    subject: "",
    teacher: "",
    time_slot: ""
  })

  useEffect(() => { fetchTimetable() }, [])

  // ✅ Auto clear success after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  async function fetchTimetable() {
    try {
      const res = await getTimetableAPI()
      setTimetable(res.data.timetable)
    } catch (err) {
      setError("Failed to load timetable")
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.subject.trim() || !form.teacher.trim() || !form.time_slot.trim()) {
      setError("All fields are required")
      return
    }

    setSubmitting(true)
    try {
      await addTimetableAPI({
        ...form,
        subject: form.subject.trim(),
        teacher: form.teacher.trim(),
        time_slot: form.time_slot.trim()
      })
      setSuccess("✅ Timetable entry added!")
      setForm({ day: "Monday", subject: "", teacher: "", time_slot: "" })
      fetchTimetable()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add entry")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTimetableAPI(id)
      setSuccess("✅ Entry deleted!")
      setDeleteConfirmId(null)
      fetchTimetable()
    } catch (err) {
      setError("Delete failed")
      setDeleteConfirmId(null)
    }
  }

  // Group timetable by day
  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = timetable.filter((e) => e.day === day)
    return acc
  }, {})

  // ✅ For students — only show days that have classes
  const daysToShow = isAdmin
    ? DAYS
    : DAYS.filter((day) => groupedByDay[day].length > 0)

  const totalClasses = timetable.length

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🗓️ Timetable</h2>
          {!loading && (
            <span className="text-sm text-gray-400">
              {totalClasses} class{totalClasses !== 1 ? "es" : ""} scheduled
            </span>
          )}
        </div>

        {/* Admin: Add Entry */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Timetable Entry</h3>
            <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Teacher Name"
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Time e.g. 9:00 - 10:00"
                value={form.time_slot}
                onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {submitting ? "Adding..." : "Add"}
              </button>
            </form>
            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}
          </div>
        )}

        {/* Timetable Grid */}
        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Loading timetable...
          </div>
        ) : daysToShow.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="text-gray-400">No timetable entries yet.</p>
            {isAdmin && <p className="text-gray-400 text-sm mt-1">Add entries using the form above.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {daysToShow.map((day) => (
              <div key={day} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Day Header */}
                <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
                  <h3 className="font-semibold">{day}</h3>
                  <span className="text-xs text-gray-400">
                    {groupedByDay[day].length} class{groupedByDay[day].length !== 1 ? "es" : ""}
                  </span>
                </div>

                {groupedByDay[day].length === 0 ? (
                  <p className="px-6 py-4 text-gray-400 text-sm italic">No classes scheduled</p>
                ) : (
                  <div className="divide-y">
                    {groupedByDay[day].map((entry) => (
                      <div key={entry.id} className="px-6 py-4 flex justify-between items-start hover:bg-gray-50 transition">
                        <div>
                          <p className="font-medium text-gray-800">{entry.subject}</p>
                          <p className="text-sm text-gray-500 mt-0.5">👨‍🏫 {entry.teacher}</p>
                          <p className="text-sm text-blue-600 mt-0.5">🕐 {entry.time_slot}</p>
                        </div>
                        {isAdmin && (
                          deleteConfirmId === entry.id ? (
                            <div className="flex gap-2 items-center ml-2">
                              <span className="text-xs text-red-600 font-medium">Sure?</span>
                              <button onClick={() => handleDelete(entry.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition">
                                Yes
                              </button>
                              <button onClick={() => setDeleteConfirmId(null)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs transition">
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(entry.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition ml-2 flex-shrink-0">
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
        )}

      </main>
    </div>
  )
}