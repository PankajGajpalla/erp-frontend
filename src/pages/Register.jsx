import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { registerAPI } from "../api"

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    student_id: "",
    username: "",
    password: "",
    confirmPassword: ""
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // ✅ Validate all fields
    if (!form.student_id || !form.username || !form.password || !form.confirmPassword) {
      setError("All fields are required")
      return
    }

    // ✅ Validate student ID is positive
    if (parseInt(form.student_id) <= 0) {
      setError("Please enter a valid Student ID")
      return
    }

    // ✅ Validate username length
    if (form.username.trim().length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    // ✅ Validate password length
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    // ✅ Validate passwords match
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const res = await registerAPI({
        student_id: parseInt(form.student_id),
        username: form.username.trim(),
        password: form.password
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Student Register</h2>
          <p className="text-gray-400 text-sm mt-1">
            Ask your admin for your Student ID first
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Student ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student ID
            </label>
            <input
              type="number"
              name="student_id"
              placeholder="Given by your admin"
              value={form.student_id}
              onChange={handleChange}
              min="1"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username (min 3 chars)"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${form.confirmPassword && form.password !== form.confirmPassword
                  ? "border-red-400"
                  : "border-gray-300"}`}
            />
            {/* ✅ Live password match indicator */}
            {form.confirmPassword && (
              <p className={`text-xs mt-1 ${form.password === form.confirmPassword ? "text-green-500" : "text-red-500"}`}>
                {form.password === form.confirmPassword ? "✅ Passwords match" : "❌ Passwords don't match"}
              </p>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Registering...
              </span>
            ) : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Login here
          </Link>
        </p>

      </div>
    </div>
  )
}
