import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { registerAPI } from "../api"

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ student_id: "", username: "", password: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.student_id || !form.username || !form.password) {
      setError("All fields are required")
      return
    }

    setLoading(true)

    try {
      const res = await registerAPI({
        ...form,
        student_id: parseInt(form.student_id)
      })
      setSuccess(res.data.message + " — Redirecting to login...")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Student Register
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Ask your admin for your Student ID first
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            name="student_id"
            placeholder="Student ID (given by admin)"
            value={form.student_id}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="username"
            placeholder="Choose a Username"
            value={form.username}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Choose a Password"
            value={form.password}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login here
          </Link>
        </p>

      </div>
    </div>
  )
}