import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import Sidebar from "../components/Sidebar"
import { importStudentsAPI } from "../api"

const REQUIRED_COLS = ["name", "phone"]
const OPTIONAL_COLS = [
  "father_name", "dob", "email", "parent_phone",
  "permanent_address", "local_address", "course", "fees", "fees_paid",
  "school_college_name", "medium", "admission_date", "photo"
]
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
  // Required
  if (!safeStr(row.name))  errors.push("name missing")
  if (!safeStr(row.phone)) errors.push("phone missing")
  // Optional but validated when present
  if (row.dob && !isValidDate(row.dob)) errors.push("dob invalid (use YYYY-MM-DD)")
  if (row.email && !isValidEmail(row.email)) errors.push("email invalid")
  if (row.fees !== undefined && row.fees !== null && row.fees !== "" && isNaN(parseFloat(row.fees))) errors.push("fees must be a number")
  if (row.fees_paid !== undefined && row.fees_paid !== null && row.fees_paid !== "" && isNaN(parseFloat(row.fees_paid))) errors.push("fees_paid must be a number")
  if (row.fees_paid != null && row.fees_paid !== "" && row.fees != null && row.fees !== "" &&
      parseFloat(row.fees_paid) > parseFloat(row.fees)) errors.push("fees_paid cannot exceed fees")
  if (row.fees_paid != null && row.fees_paid !== "" && parseFloat(row.fees_paid) < 0) errors.push("fees_paid cannot be negative")
  if (row.medium && !VALID_MEDIUMS.includes(String(row.medium).toLowerCase().trim())) errors.push("medium must be 'hindi' or 'english'")
  if (row.admission_date && !isValidDate(row.admission_date)) errors.push("admission_date invalid (use YYYY-MM-DD)")
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
    fees_paid: "5000",
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

    if (validCount === 0) {
      setError("No valid rows to import. Please fix the errors first.")
      return
    }

    setLoading(true)
    try {
      // Only send valid rows — skip invalid ones entirely
      const students = preview
        .filter((_, i) => !rowErrors[i])
        .map((row) => ({
          name: safeStr(row.name),
          father_name: safeStr(row.father_name) || null,
          dob: toDateString(row.dob),
          email: safeStr(row.email).toLowerCase() || null,
          phone: safeStr(row.phone) || null,
          parent_phone: safeStr(row.parent_phone) || null,
          permanent_address: safeStr(row.permanent_address) || null,
          local_address: safeStr(row.local_address) || null,
          course: safeStr(row.course) || null,
          fees: row.fees != null && row.fees !== "" ? parseFloat(row.fees) : null,
          fees_paid: row.fees_paid != null && row.fees_paid !== "" ? parseFloat(row.fees_paid) : null,
          school_college_name: safeStr(row.school_college_name) || null,
          medium: safeStr(row.medium).toLowerCase() || null,
          admission_date: toDateString(row.admission_date),
          photo: row.photo ? safeStr(row.photo) : null,
        }))

      const res = await importStudentsAPI({ students })
      const skippedFrontend = errorCount              // rows rejected by frontend validation
      const skippedDupes   = res.data.skipped          // phone/email already in DB
      const skippedBackend = res.data.skipped_errors ?? 0  // unexpected DB errors per row

      setResult({
        imported: res.data.imported,
        skipped: skippedDupes,
        skipped_errors: skippedFrontend + skippedBackend,
      })

      let msg = `✅ ${res.data.imported} student${res.data.imported !== 1 ? "s" : ""} imported`
      if (skippedDupes > 0)                      msg += `, ${skippedDupes} skipped (duplicate phone/email)`
      if (skippedFrontend > 0)                   msg += `, ${skippedFrontend} skipped (invalid data)`
      if (skippedBackend > 0)                    msg += `, ${skippedBackend} skipped (server error)`
      setSuccess(msg)
      setPreview([])
      setRowErrors({})
      setFileName("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Import Students</h2>
          <button
            onClick={downloadTemplate}
            className="btn-success"
          >
            Download Template
          </button>
        </div>

        {/* Column info */}
        <div className="card p-5 mb-5">
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
        <div className="card p-6 mb-5">
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
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="card p-5 border-l-4 border-green-500">
              <p className="text-xs text-slate-500 font-medium">Imported</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{result.imported}</p>
            </div>
            <div className="card p-5 border-l-4 border-yellow-500">
              <p className="text-xs text-slate-500 font-medium">Skipped (duplicate)</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{result.skipped}</p>
            </div>
            <div className="card p-5 border-l-4 border-red-400">
              <p className="text-xs text-slate-500 font-medium">Skipped (invalid)</p>
              <p className="text-3xl font-bold text-red-500 mt-1">{result.skipped_errors ?? 0}</p>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="card overflow-hidden">
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
                  disabled={loading || validCount === 0}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
                >
                  {loading
                    ? "Importing..."
                    : errorCount > 0
                      ? `Import ${validCount} Valid (Skip ${errorCount} Invalid)`
                      : `Import All ${validCount} Students`}
                </button>
              </div>
            </div>

            {errorCount > 0 && (
              <div className="mx-5 mb-3 mt-1 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 flex items-start gap-3">
                <span className="text-xl mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {errorCount} row{errorCount > 1 ? "s" : ""} will be skipped due to errors
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Only the <strong>{validCount} valid rows</strong> (shown in white) will be imported.
                    Rows highlighted in red will be ignored — fix them and re-upload to include them.
                  </p>
                </div>
              </div>
            )}

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
                    <th className="px-4 py-3 text-left">Total Fees</th>
                    <th className="px-4 py-3 text-left">Fees Paid</th>
                    <th className="px-4 py-3 text-left">Pending</th>
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
                        <td className="px-4 py-2">{row.fees != null && row.fees !== "" ? `₹${row.fees}` : <Err />}</td>
                        <td className="px-4 py-2">
                          {row.fees_paid != null && row.fees_paid !== ""
                            ? <span className="text-green-600 font-medium">₹{row.fees_paid}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          {row.fees != null && row.fees !== ""
                            ? (() => {
                                const paid    = parseFloat(row.fees_paid) || 0
                                const total   = parseFloat(row.fees)
                                const pending = total - paid
                                return pending <= 0
                                  ? <span className="text-green-600 font-medium">Paid ✅</span>
                                  : <span className="text-red-500 font-medium">₹{pending.toLocaleString()}</span>
                              })()
                            : <span className="text-gray-300">—</span>}
                        </td>
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
