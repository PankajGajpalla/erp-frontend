import { useEffect, useMemo, useRef, useState } from "react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getStudentAPI, getGradesAPI, attendanceSummaryAPI, subjectWiseAttendanceAPI } from "../api"

function gradeColor(g) {
  if (g === "A+" || g === "A") return "#16a34a"
  if (g === "B") return "#2563eb"
  if (g === "C") return "#ca8a04"
  if (g === "D") return "#ea580c"
  return "#dc2626"
}

function overallGrade(pct) {
  if (pct >= 90) return "A+"
  if (pct >= 80) return "A"
  if (pct >= 70) return "B"
  if (pct >= 60) return "C"
  if (pct >= 50) return "D"
  return "F"
}

function groupBySubject(grades) {
  const map = {}
  for (const g of grades) {
    if (!map[g.subject]) map[g.subject] = []
    map[g.subject].push(g)
  }
  return map
}

export default function ReportCardModal({ studentId, onClose }) {
  const cardRef = useRef(null)
  const [student, setStudent]       = useState(null)
  const [grades, setGrades]         = useState([])
  const [attendance, setAttendance] = useState(null)
  const [subjectAtt, setSubjectAtt] = useState([])
  const [loading, setLoading]       = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError]           = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [sRes, gRes, aRes, saRes] = await Promise.all([
          getStudentAPI(studentId),
          getGradesAPI(studentId),
          attendanceSummaryAPI(studentId),
          subjectWiseAttendanceAPI(studentId),
        ])
        setStudent(sRes.data)
        setGrades(gRes.data.grades || [])
        setAttendance(aRes.data)
        setSubjectAtt(saRes.data.subjects || [])
      } catch { setError("Failed to load report card data") }
      finally { setLoading(false) }
    }
    load()
  }, [studentId])

  async function downloadPDF() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgH  = (canvas.height * pageW) / canvas.width
      let y = 0
      while (y < imgH) {
        pdf.addImage(imgData, "PNG", 0, -y, pageW, imgH)
        y += pageH
        if (y < imgH) pdf.addPage()
      }
      pdf.save(`ReportCard_${student?.name || studentId}.pdf`)
    } catch { alert("PDF generation failed. Try again.") }
    finally { setDownloading(false) }
  }

  const { grouped, subjects, avgPct, finalGrade } = useMemo(() => {
    const grouped    = groupBySubject(grades)
    const subjects   = Object.keys(grouped)
    const totalMarks = grades.reduce((s, g) => s + g.marks, 0)
    const totalMax   = grades.reduce((s, g) => s + g.total_marks, 0)
    const avgPct     = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 0
    const finalGrade = overallGrade(parseFloat(avgPct))
    return { grouped, subjects, avgPct, finalGrade }
  }, [grades])
  const attPct = attendance?.attendance_percentage ?? 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4"
        onClick={e => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
          <h3 className="font-bold text-gray-800">Report Card</h3>
          <div className="flex gap-2">
            <button onClick={downloadPDF} disabled={downloading || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {downloading ? "Generating PDF…" : "⬇ Download PDF"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2">&times;</button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading report card…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          /* ── Printable Card ── */
          <div ref={cardRef} className="bg-white p-8 font-sans">

            {/* Header */}
            <div className="text-center border-b-2 border-blue-700 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-blue-800 tracking-wide">STUDENT REPORT CARD</h1>
              <p className="text-gray-500 text-sm mt-1">Academic Performance Report</p>
            </div>

            {/* Student Info */}
            <div className="flex gap-5 mb-6 bg-gray-50 rounded-xl p-4">
              {student?.photo
                ? <img src={student.photo} alt={student.name} className="w-24 h-28 rounded-lg object-cover border-2 border-gray-200 flex-shrink-0" />
                : <div className="w-24 h-28 rounded-lg bg-blue-100 flex items-center justify-center text-4xl flex-shrink-0">🎓</div>
              }
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 flex-1 text-sm">
                <Info label="Student ID"  value={student?.student_code} />
                <Info label="Name"        value={student?.name} />
                <Info label="Father Name" value={student?.father_name} />
                <Info label="Course"      value={student?.course} />
                <Info label="Date of Birth"    value={student?.dob} />
                <Info label="Admission Date"   value={student?.admission_date} />
                <Info label="School / College" value={student?.school_college_name} />
                <Info label="Medium"      value={student?.medium ? student.medium.charAt(0).toUpperCase() + student.medium.slice(1) : null} />
              </div>
            </div>

            {/* Summary Boxes */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryBox label="Subjects"         value={subjects.length}    color="#2563eb" />
              <SummaryBox label="Attendance"        value={`${attPct}%`}       color={attPct >= 75 ? "#16a34a" : attPct >= 50 ? "#ca8a04" : "#dc2626"} />
              <SummaryBox label="Academic Score"    value={`${avgPct}%`}       color="#7c3aed" />
              <SummaryBox label="Overall Grade"     value={finalGrade}         color={gradeColor(finalGrade)} />
            </div>

            {/* Attendance */}
            {subjectAtt.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 border-b pb-1">Attendance</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Subject</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">Present</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">Total</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">%</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectAtt.map((s, i) => (
                      <tr key={s.subject} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 font-medium">{s.subject}</td>
                        <td className="px-3 py-2 text-center">{s.present}</td>
                        <td className="px-3 py-2 text-center">{s.total}</td>
                        <td className="px-3 py-2 text-center font-semibold"
                          style={{ color: s.percentage >= 75 ? "#16a34a" : s.percentage >= 50 ? "#ca8a04" : "#dc2626" }}>
                          {s.percentage}%
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {s.percentage >= 75 ? "✅ Good" : s.percentage >= 50 ? "⚠️ Low" : "❌ Critical"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Academic Performance */}
            {subjects.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 border-b pb-1">Academic Performance</h2>
                {subjects.map((subject) => {
                  const tests = grouped[subject]
                  const subPct = tests.reduce((s,g) => s + g.marks, 0) / tests.reduce((s,g) => s + g.total_marks, 0) * 100
                  return (
                    <div key={subject} className="mb-4">
                      <div className="flex justify-between items-center bg-gray-100 px-3 py-1.5 rounded-t">
                        <span className="font-semibold text-gray-800 text-sm">{subject}</span>
                        <span className="text-xs font-bold" style={{ color: gradeColor(overallGrade(subPct)) }}>
                          Avg: {subPct.toFixed(1)}% — {overallGrade(subPct)}
                        </span>
                      </div>
                      <table className="w-full text-xs border-collapse border border-gray-200 rounded-b overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-3 py-1.5 font-medium text-gray-500">Test</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">Marks</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">Total</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">%</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tests.map((g, i) => {
                            const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                            return (
                              <tr key={g.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-3 py-1.5">{g.test_title || "—"}</td>
                                <td className="px-3 py-1.5 text-center">{g.marks}</td>
                                <td className="px-3 py-1.5 text-center">{g.total_marks}</td>
                                <td className="px-3 py-1.5 text-center font-medium"
                                  style={{ color: parseFloat(pct) >= 50 ? "#16a34a" : "#dc2626" }}>{pct}%</td>
                                <td className="px-3 py-1.5 text-center font-bold"
                                  style={{ color: gradeColor(g.grade) }}>{g.grade}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </section>
            )}

            {/* Footer */}
            <div className="mt-6 pt-3 border-t flex justify-between text-xs text-gray-400">
              <span>Generated on {new Date().toLocaleDateString("en-IN")}</span>
              <span>{student?.student_code} · {student?.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}: </span>
      <span className="font-medium text-gray-800">{value || "—"}</span>
    </div>
  )
}

function SummaryBox({ label, value, color }) {
  return (
    <div className="rounded-lg border-2 p-3 text-center" style={{ borderColor: color }}>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
