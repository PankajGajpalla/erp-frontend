import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getTimetableAPI, addTimetableAPI, deleteTimetableAPI } from "../api"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function Timetable() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    day: "Monday",
    subject: "",
    teacher: "",
    time_slot: ""
  })

  useEffect(() => {
    fetchTimetable()
  }, [])

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

    if (!form.subject || !form.teacher || !form.time_slot) {
      setError("All fields are required")
      return
    }

    try {
      await addTimetableAPI(form)
      setSuccess("Timetable entry added!")
      setForm({ day: "Monday", subject: "", teacher: "", time_slot: "" })
      fetchTimetable()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add entry")
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this timetable entry?")) return
    try {
      await deleteTimetableAPI(id)
      setSuccess("Entry deleted!")
      fetchTimetable()
    } catch (err) {
      setError("Delete failed")
    }
  }

  // Group timetable by day
  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = timetable.filter((e) => e.day === day)
    return acc
  }, {})

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">🗓️ Timetable</h2>

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
                placeholder="Teacher"
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
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Add
              </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
          </div>
        )}

        {/* Timetable Grid by Day */}
        {loading ? (
          <p className="text-gray-500">Loading timetable...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {DAYS.map((day) => (
              <div key={day} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="bg-gray-800 text-white px-6 py-3">
                  <h3 className="font-semibold">{day}</h3>
                </div>
                {groupedByDay[day].length === 0 ? (
                  <p className="px-6 py-4 text-gray-400 text-sm">No classes</p>
                ) : (
                  <div className="divide-y">
                    {groupedByDay[day].map((entry) => (
                      <div key={entry.id} className="px-6 py-4 flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{entry.subject}</p>
                          <p className="text-sm text-gray-500">👨‍🏫 {entry.teacher}</p>
                          <p className="text-sm text-blue-600">🕐 {entry.time_slot}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition"
                          >
                            Delete
                          </button>
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