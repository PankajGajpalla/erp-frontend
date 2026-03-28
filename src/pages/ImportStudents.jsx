import { useState } from "react"
import * as XLSX from "xlsx"
import Sidebar from "../components/Sidebar"
import { importStudentsAPI } from "../api"

export default function ImportStudents() {
  const [preview, setPreview] = useState([])
  const [fileName, setFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    setError("")
    setSuccess("")
    setResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: "binary" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet)

        if (rows.length === 0) {
          setError("Excel file is empty!")
          return
        }

        // Normalize column names to lowercase
        const normalized = rows.map((row) => {
          const obj = {}
          Object.keys(row).forEach((key) => {
            obj[key.toLowerCase().trim()] = row[key]
          })
          return obj
        })

        setPreview(normalized)
      } catch (err) {
        setError("Failed to read Excel file")
      }
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    setError("")
    setSuccess("")
    setLoading(true)

    // Validate required fields
    const invalid = preview.filter((row) => !row.name || !row.age || !row.email)
    if (invalid.length > 0) {
      setError(`${invalid.length} rows are missing name, age or email!`)
      setLoading(false)
      return
    }

    try {
      const students = preview.map((row) => ({
        name: String(row.name),
        age: parseInt(row.age),
        email: String(row.email),
        phone: row.phone ? String(row.phone) : null,
        address: row.address ? String(row.address) : null,
        course: row.course ? String(row.course) : null,
        fees: row.fees ? parseFloat(row.fees) : null
        }))

      const res = await importStudentsAPI({ students })
      setResult(res.data)
      setSuccess(`✅ ${res.data.imported} students imported, ${res.data.skipped} skipped (duplicates)`)
      setPreview([])
      setFileName("")
    } catch (err) {
      setError(err.response?.data?.detail || "Import failed")
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setPreview([])
    setFileName("")
    setError("")
    setSuccess("")
    setResult(null)
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">📥 Import Students</h2>

        {/* Upload Box */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Upload Excel File</h3>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition">
            <p className="text-gray-400 mb-4">
              Excel file must have these columns:
            </p>
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {["name", "age", "email", "phone", "address", "course", "fees"].map((col) => (
                <span key={col} className={`px-3 py-1 rounded-full text-xs font-medium
                    ${["name", "age", "email"].includes(col)
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"}`}>
                    {col} {["name", "age", "email"].includes(col) ? "✱" : "(optional)"}
                </span>
                ))}
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
              id="fileInput"
            />
            <label
              htmlFor="fileInput"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer"
            >
              Choose File
            </label>
            {fileName && (
              <p className="text-sm text-gray-500 mt-3">📄 {fileName}</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
        </div>

        {/* Result */}
        {result && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Imported</p>
              <p className="text-3xl font-bold text-green-600">{result.imported}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
              <p className="text-sm text-gray-500">Skipped (duplicates)</p>
              <p className="text-3xl font-bold text-yellow-600">{result.skipped}</p>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b">
              <h3 className="text-lg font-semibold text-gray-700">
                Preview — {preview.length} students found
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handleClear}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-400 transition"
                >
                  Clear
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? "Importing..." : `Import ${preview.length} Students`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-6 py-3">#</th>
                    <th className="text-left px-6 py-3">Name</th>
                    <th className="text-left px-6 py-3">Age</th>
                    <th className="text-left px-6 py-3">Email</th>
                    <th className="text-left px-6 py-3">Phone</th>
                    <th className="text-left px-6 py-3">Address</th>
                    <th className="text-left px-6 py-3">Course</th>
                    <th className="text-left px-6 py-3">Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-6 py-3 font-medium">{row.name || <span className="text-red-500">Missing!</span>}</td>
                      <td className="px-6 py-3">{row.age || <span className="text-red-500">Missing!</span>}</td>
                      <td className="px-6 py-3">{row.email || <span className="text-red-500">Missing!</span>}</td>
                      <td className="px-6 py-3">{row.phone || "—"}</td>
                        <td className="px-6 py-3">{row.address || "—"}</td>
                        <td className="px-6 py-3">{row.course || "—"}</td>
                        <td className="px-6 py-3">{row.fees ? `₹${row.fees}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}