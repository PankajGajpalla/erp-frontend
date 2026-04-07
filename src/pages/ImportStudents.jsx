import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import Sidebar from "../components/Sidebar"
import { importStudentsAPI } from "../api"

const REQUIRED_COLS = ["name", "age", "email"]
const OPTIONAL_COLS = ["phone", "address", "course", "fees"]
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS]
const MAX_FILE_SIZE_MB = 5

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))
}

function validateRow(row) {
  const errors = []
  if (!row.name) errors.push("name missing")
  if (!row.age || isNaN(parseInt(row.age))) errors.push("age invalid")
  if (!row.email) errors.push("email missing")
  else if (!isValidEmail(row.email)) errors.push("email invalid")
  return errors
}

export default function ImportStudents() {
  const [preview, setPreview] = useState([])
  const [rowErrors, setRowErrors] = useState({}) // { index: ["error1", "error2"] }
  const [fileName, setFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [result, setResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  function processFile(file) {
    if (!file) return

    // ✅ File size validation
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setError(`File too large! Max size is ${MAX_FILE_SIZE_MB}MB. Your file is ${sizeMB.toFixed(1)}MB.`)
      return
    }

    // ✅ File type validation
    const validTypes = [".xlsx", ".xls", ".csv"]
    const ext = "." + file.name.split(".").pop().toLowerCase()
    if (!validTypes.includes(ext)) {
      setError("Invalid file type. Please upload .xlsx, .xls or .csv file.")
      return
    }

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

        if (rows.length > 1000) {
          setError("Too many rows! Max 1000 students per import.")
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

        // ✅ Validate each row
        const errors = {}
        normalized.forEach((row, i) => {
          const rowErrs = validateRow(row)
          if (rowErrs.length > 0) errors[i] = rowErrs
        })

        setPreview(normalized)
        setRowErrors(errors)
      } catch (err) {
        setError("Failed to read file. Make sure it's a valid Excel or CSV file.")
      }
    }
    reader.readAsBinaryString(file)
  }

  function handleFile(e) {
    processFile(e.target.files[0])
  }

  // ✅ Drag and drop handlers
  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  async function handleImport() {
    setError("")
    setSuccess("")

    // ✅ Block import if there are row errors
    const errorCount = Object.keys(rowErrors).length
    if (errorCount > 0) {
      setError(`Fix ${errorCount} invalid row${errorCount > 1 ? "s" : ""} before importing (highlighted in red)`)
      return
    }

    setLoading(true)
    try {
      const students = preview.map((row) => ({
        name: String(row.name).trim(),
        age: parseInt(row.age),
        email: String(row.email).trim().toLowerCase(),
        phone: row.phone ? String(row.phone).trim() : null,
        address: row.address ? String(row.address).trim() : null,
        course: row.course ? String(row.course).trim() : null,
        fees: row.fees ? parseFloat(row.fees) : null
      }))

      const res = await importStudentsAPI({ students })
      setResult(res.data)
      setSuccess(`✅ ${res.data.imported} students imported, ${res.data.skipped} skipped (duplicates)`)
      setPreview([])
      setRowErrors({})
      setFileName("")
      // ✅ Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      setError(err.response?.data?.detail || "Import failed")
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setPreview([])
    setRowErrors({})
    setFileName("")
    setError("")
    setSuccess("")
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const errorCount = Object.keys(rowErrors).length
  const validCount = preview.length - errorCount

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">📥 Import Students</h2>

        {/* Upload Box */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Upload Excel File</h3>

          {/* Required columns info */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_COLS.map((col) => (
              <span key={col} className={`px-3 py-1 rounded-full text-xs font-medium
                ${REQUIRED_COLS.includes(col)
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"}`}>
                {col} {REQUIRED_COLS.includes(col) ? "✱" : "(optional)"}
              </span>
            ))}
          </div>

          {/* ✅ Drag and drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition
              ${isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400"}`}
          >
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-500 mb-1">Drag & drop your Excel file here</p>
            <p className="text-gray-400 text-sm mb-4">or</p>
            <input
              ref={fileInputRef}
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
            <p className="text-xs text-gray-400 mt-2">
              Supports .xlsx, .xls, .csv · Max {MAX_FILE_SIZE_MB}MB · Max 1000 rows
            </p>
          </div>

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

        {/* Result */}
        {result && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Successfully Imported</p>
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
            <div className="p-6 flex justify-between items-center border-b flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Preview — {preview.length} students found
                </h3>
                <div className="flex gap-3 mt-1 text-sm">
                  <span className="text-green-600">✅ {validCount} valid</span>
                  {errorCount > 0 && (
                    <span className="text-red-600">❌ {errorCount} with errors</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleClear}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-400 transition">
                  Clear
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || errorCount > 0}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? "Importing..." : `Import ${validCount} Students`}
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
                    <th className="text-left px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const hasError = rowErrors[i]
                    return (
                      <tr key={`${row.email}-${i}`}
                        className={`border-t transition
                          ${hasError ? "bg-red-50" : "hover:bg-gray-50"}`}>
                        <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium">
                          {row.name || <span className="text-red-500 text-xs">Missing!</span>}
                        </td>
                        <td className="px-6 py-3">
                          {row.age || <span className="text-red-500 text-xs">Missing!</span>}
                        </td>
                        <td className="px-6 py-3">
                          {row.email
                            ? isValidEmail(row.email)
                              ? row.email
                              : <span className="text-red-500 text-xs">Invalid email!</span>
                            : <span className="text-red-500 text-xs">Missing!</span>}
                        </td>
                        <td className="px-6 py-3">{row.phone || "—"}</td>
                        <td className="px-6 py-3">{row.address || "—"}</td>
                        <td className="px-6 py-3">{row.course || "—"}</td>
                        <td className="px-6 py-3">{row.fees ? `₹${row.fees}` : "—"}</td>
                        <td className="px-6 py-3">
                          {hasError ? (
                            <span className="text-red-600 text-xs font-medium">
                              ❌ {rowErrors[i].join(", ")}
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs font-medium">✅ Valid</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}