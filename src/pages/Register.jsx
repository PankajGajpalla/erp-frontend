import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Alert, Spinner } from "../components/UI"
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

    if (!form.student_id || !form.username || !form.password || !form.confirmPassword) {
      setError("All fields are required"); return
    }
    if (parseInt(form.student_id) <= 0) {
      setError("Please enter a valid Student ID"); return
    }
    if (form.username.trim().length < 3) {
      setError("Username must be at least 3 characters"); return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters"); return
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match"); return
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Student Register</h2>
          <p className="text-slate-400 text-sm mt-1">Ask your admin for your Student ID first</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="form-label text-sm">Student ID</label>
            <input type="number" name="student_id" placeholder="Given by your admin"
              value={form.student_id} onChange={handleChange} min="1" className="inp" />
          </div>

          <div>
            <label className="form-label text-sm">Username</label>
            <input type="text" name="username" placeholder="Choose a username (min 3 chars)"
              value={form.username} onChange={handleChange} autoComplete="username" className="inp" />
          </div>

          <div>
            <label className="form-label text-sm">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password" placeholder="Min 6 characters"
                value={form.password} onChange={handleChange}
                autoComplete="new-password" className="inp pr-14" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label text-sm">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword" placeholder="Re-enter your password"
              value={form.confirmPassword} onChange={handleChange}
              autoComplete="new-password"
              className={`inp ${form.confirmPassword && form.password !== form.confirmPassword ? "border-red-400 focus:ring-red-400" : ""}`} />
            {form.confirmPassword && (
              <p className={`text-xs mt-1 ${form.password === form.confirmPassword ? "text-emerald-500" : "text-red-500"}`}>
                {form.password === form.confirmPassword ? "✅ Passwords match" : "❌ Passwords don't match"}
              </p>
            )}
          </div>

          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <button type="submit" disabled={loading}
            className="w-full btn-success py-2.5 disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Registering...
              </span>
            ) : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">Login here</Link>
        </p>

      </div>
    </div>
  )
}
