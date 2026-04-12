import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import Sidebar from "../components/Sidebar"
import { importStudentsAPI } from "../api"

const REQUIRED_COLS = [
  "name", "father_name", "dob", "email", "phone", "parent_phone",
  "permanent_address", "local_address", "course", "fees",
  "school_college_name", "medium", "admission_date"
]
const OPTIONAL_COLS = ["photo"]
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS]
const VALID_MEDIUMS = ["hindi", "english"]
const MAX_FILE_SIZE_MB = 5

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))
}

function isValidDate(val) {
  if (!val) return false
  // Accept YYYY-MM-DD string or Excel serial number
  if (typeof val === "number") return true // Excel date serial
  const d = new Date(val)
  return !isNaN(d.getTime())
}

function toDateString(val) {
  if (!val) return null
  if (typeof val === "number") {
    // Excel date serial to JS date
    const date = new Date(Math.round((val - 25569) * 864e5))
    return date.toISOString().split("T")[0]
  }
  const d = new Date(val)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split("T")[0]
}

function safeStr(val) {
  return val != null ? String(val).trim() : ""
}

function validateRow(row) {
  const errors = []
  if (!safeStr(row.name)) errors.push("name missing")
  if (!safeStr(row.father_name)) errors.push("father_name missing")
  if (!row.dob) errors.push("dob missing")
  else if (!isValidDate(row.dob)) errors.push("dob invalid (use YYYY-MM-DD)")
  if (!row.email) errors.push("email missing")
  else if (!isValidEmail(row.email)) errors.push("email invalid")
  if (!safeStr(row.phone)) errors.push("phone missing")
  if (!safeStr(row.parent_phone)) errors.push("parent_phone missing")
  if (!safeStr(row.permanent_address)) errors.push("permanent_address missing")
  if (!safeStr(row.local_address)) errors.push("local_address missing")
  if (!safeStr(row.course)) errors.push("course missing")
  if (row.fees === undefined || row.fees === null || row.fees === "") errors.push("fees missing")
  else if (isNaN(parseFloat(row.fees))) errors.push("fees invalid (must be a number)")
  if (!safeStr(row.school_college_name)) errors.push("school_college_name missing")
  if (!safeStr(row.medium)) errors.push("medium missing")
  else if (!VALID_MEDIUMS.includes(String(row.medium).toLowerCase().trim())) errors.push("medium must be 'hindi' or 'english'")
  if (!row.admission_date) errors.push("admission_date missing")
  else if (!isValidDate(row.admission_date)) errors.push("admission_date invalid (use YYYY-MM-DD)")
  return errors
}

function downloadTemplate() {
  const headers = ALL_COLS
  const sample = [{
    name: "Ram Kumar",
    father_name: "Shyam Kumar",
    dob: "2005-06-15",
    email: "ram@example.com",
    phone: "9876543210",
    parent_phone: "9876543211",
    permanent_address: "Village Rampur, Dist. Lucknow, UP - 226001",
    local_address: "123 Main St, Lucknow",
    course: "Class 10",
    fees: "12000",
    school_college_name: "ABC High School",
    medium: "hindi",
    admission_date: "2024-04-01",
    photo: ""
  }]
  const ws = XLSX.utils.json_to_sheet(sample, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Students")
  XLSX.writeFile(wb, "student_import_template.xlsx")
}

export default function ImportStudents() {
  const [preview, setPreview] = useState([])
  const [rowErrors, setRowErrors] = useState({})
  const [fileName, setFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [result, setResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  function processFile(file) {
    if (!file) return

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setError(`File too large! Max ${MAX_FILE_SIZE_MB}MB. Your file is ${sizeMB.toFixed(1)}MB.`)
      return
    }

    const ext = "." + file.name.split(".").pop().toLowerCase()
    if (![".xlsx", ".xls", ".csv"].includes(ext)) {
      setError("Invalid file type. Please upload .xlsx, .xls or .csv")
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
        const rows = XLSX.utils.sheet_to_json(sheet, { raw: true })

        if (rows.length === 0) { setError("File is empty!"); return }
        if (rows.length > 1000) { setError("Max 1000 rows per import."); return }

        // Normalize keys to lowercase
        const normalized = rows.map((row) => {
          const obj = {}
          Object.keys(row).forEach((key) => {
            obj[key.toLowerCase().trim().replace(/\s+/g, "_")] = row[key]
          })
          return obj
        })

        const errors = {}
        normalized.forEach((row, i) => {
          const errs = validateRow(row)
          if (errs.length > 0) errors[i] = errs
        })

        setPreview(normalized)
        setRowErrors(errors)
      } catch {
        setError("Failed to read file. Make sure it's a valid Excel or CSV file.")
      }
    }
    reader.readAsBinaryString(file)
  }

  function handleFile(e) { processFile(e.target.files[0]) }

  function handleDragOver(e) { e.preventDefault(); setIsDragging(true) }
  function handleDragLeave() { setIsDragging(false) }
  function handleDrop(e) { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]) }

  async function handleImport() {
    setError("")
    setSuccess("")
    const errorCount = Object.keys(rowErrors).length
    if (errorCount > 0) {
      setError(`Fix ${errorCount} invalid row${errorCount > 1 ? "s" : ""} before importing (highlighted in red)`)
      return
    }

    setLoading(true)
    try {
      const students = preview.map((row) => ({
        name: safeStr(row.name),
        father_name: safeStr(row.father_name) || null,
        dob: toDateString(row.dob),
        email: safeStr(row.email).toLowerCase(),
        phone: safeStr(row.phone) || null,
        parent_phone: safeStr(row.parent_phone) || null,
        permanent_address: safeStr(row.permanent_address) || null,
        local_address: safeStr(row.local_address) || null,
        course: safeStr(row.course) || null,
        fees: row.fees != null && row.fees !== "" ? parseFloat(row.fees) : null,
        school_college_name: safeStr(row.school_college_name) || null,
        medium: safeStr(row.medium).toLowerCase() || null,
        admission_date: toDateString(row.admission_date),
        photo: row.photo ? safeStr(row.photo) : null,
      }))

      const res = await importStudentsAPI({ students })
      setResult(res.data)
      setSuccess(`${res.data.imported} students imported, ${res.data.skipped} skipped (duplicates)`)
      setPreview([])
      setRowErrors({})
      setFileName("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        // Pydantic 422 validation errors
        const msgs = detail.map((d) => {
          const field = Array.isArray(d.loc) ? d.loc.slice(1).join(" → ") : ""
          return field ? `${field}: ${d.msg}` : (d.msg || JSON.stringify(d))
        }).join("; ")
        setError("Validation error — " + msgs)
      } else {
        setError(detail || err.message || "Import failed. Please check your data and try again.")
      }
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
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Import Students</h2>
          <button
            onClick={downloadTemplate}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            Download Template
          </button>
        </div>

        {/* Column info */}
        <div className="bg-white rounded-xl shadow p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Required columns in your Excel file:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {REQUIRED_COLS.map((col) => (
              <span key={col} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {col} *
              </span>
            ))}
            {OPTIONAL_COLS.map((col) => (
              <span key={col} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                {col} (optional)
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Dates format: <strong>YYYY-MM-DD</strong> &nbsp;|&nbsp;
            Medium values: <strong>hindi</strong> or <strong>english</strong> &nbsp;|&nbsp;
            Click <strong>Download Template</strong> for a sample file.
          </p>
        </div>

        {/* Upload Box */}
        <div className="bg-white rounded-xl shadow p-6 mb-5">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition
              ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
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
            {fileName && <p className="text-sm text-gray-500 mt-3">📄 {fileName}</p>}
            <p className="text-xs text-gray-400 mt-2">
              .xlsx, .xls, .csv · Max {MAX_FILE_SIZE_MB}MB · Max 1000 rows
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

        {/* Import result */}
        {result && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Successfully Imported</p>
              <p className="text-3xl font-bold text-green-600">{result.imported}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-500">
              <p className="text-sm text-gray-500">Skipped (duplicates)</p>
              <p className="text-3xl font-bold text-yellow-600">{result.skipped}</p>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-5 flex justify-between items-center border-b flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Preview — {preview.length} rows found
                </h3>
                <div className="flex gap-3 mt-1 text-sm">
                  <span className="text-green-600">{validCount} valid</span>
                  {errorCount > 0 && <span className="text-red-600">{errorCount} with errors</span>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleClear}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
                  Clear
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || errorCount > 0}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? "Importing..." : `Import ${validCount} Students`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Father Name</th>
                    <th className="px-4 py-3 text-left">DOB</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Parent Phone</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Fees</th>
                    <th className="px-4 py-3 text-left">Medium</th>
                    <th className="px-4 py-3 text-left">Admission</th>
                    <th className="px-4 py-3 text-left">School/College</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const hasError = !!rowErrors[i]
                    return (
                      <tr key={i} className={`border-t transition ${hasError ? "bg-red-50" : "hover:bg-gray-50"}`}>
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{row.name || <Err />}</td>
                        <td className="px-4 py-2">{row.father_name || <Err />}</td>
                        <td className="px-4 py-2">{toDateString(row.dob) || <Err label="invalid date" />}</td>
                        <td className="px-4 py-2">
                          {row.email
                            ? isValidEmail(row.email) ? row.email : <Err label="invalid email" />
                            : <Err />}
                        </td>
                        <td className="px-4 py-2">{row.phone || <Err />}</td>
                        <td className="px-4 py-2">{row.parent_phone || <Err />}</td>
                        <td className="px-4 py-2">{row.course || <Err />}</td>
                        <td className="px-4 py-2">{row.fees != null ? `₹${row.fees}` : <Err />}</td>
                        <td className="px-4 py-2">
                          {row.medium
                            ? VALID_MEDIUMS.includes(row.medium.toString().toLowerCase().trim())
                              ? row.medium
                              : <Err label="must be hindi/english" />
                            : <Err />}
                        </td>
                        <td className="px-4 py-2">{toDateString(row.admission_date) || <Err label="invalid date" />}</td>
                        <td className="px-4 py-2">{row.school_college_name || <Err />}</td>
                        <td className="px-4 py-2">
                          {hasError
                            ? <span className="text-red-600 font-medium">❌ {rowErrors[i].join(", ")}</span>
                            : <span className="text-green-600 font-medium">✅ OK</span>}
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

function Err({ label = "missing" }) {
  return <span className="text-red-500 font-medium">{label}!</span>
}
