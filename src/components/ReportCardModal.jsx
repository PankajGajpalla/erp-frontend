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

// ── Smart recommendations engine ─────────────────────────────
function buildRecommendations(attPct, avgPct, subjectStats) {
  const tips = []

  // Attendance-based
  if (attPct < 50) {
    tips.push({
      icon: "🚨",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
      title: "Critical Attendance Issue",
      text: `Attendance is only ${attPct}%, which is critically low. Regular presence in class is the single most important factor for academic success. Please ensure the student attends every class without fail. Students below 75% attendance may face restrictions in exams.`,
    })
  } else if (attPct < 75) {
    tips.push({
      icon: "⚠️",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      title: "Attendance Needs Improvement",
      text: `Attendance is ${attPct}%, below the required 75% threshold. Missing classes directly impacts understanding of topics and exam performance. Aim to attend all scheduled classes consistently to stay on track.`,
    })
  } else if (attPct >= 90) {
    tips.push({
      icon: "✅",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      title: "Excellent Attendance",
      text: `Attendance is outstanding at ${attPct}%. This consistent presence in class is a great foundation for academic success. Keep it up!`,
    })
  }

  // Overall academic performance
  if (avgPct < 40) {
    tips.push({
      icon: "📚",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
      title: "Urgent Academic Support Needed",
      text: `Overall academic score is ${avgPct}%, which requires immediate attention. We strongly recommend arranging extra coaching or tutoring sessions, daily revision at home, and regular one-on-one discussions with subject teachers to identify and address learning gaps.`,
    })
  } else if (avgPct < 60) {
    tips.push({
      icon: "📖",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      title: "Academic Performance Needs Attention",
      text: `Overall academic score is ${avgPct}%. Dedicated home study of at least 1-2 hours daily, solving past test papers, and seeking teacher guidance for difficult topics will help improve performance significantly.`,
    })
  }

  // Subject-specific weak areas
  const weakSubjects = subjectStats.filter(s => s.pct < 50)
  const avgSubjects  = subjectStats.filter(s => s.pct >= 50 && s.pct < 70)

  if (weakSubjects.length > 0) {
    const names = weakSubjects.map(s => s.name).join(", ")
    tips.push({
      icon: "🎯",
      color: "#7c3aed",
      bg: "#faf5ff",
      border: "#e9d5ff",
      title: `Weak Subjects Require Extra Focus`,
      text: `The student is struggling in: ${names}. Parents should arrange subject-specific tutoring or additional practice material for these subjects. Encourage the student to ask teachers questions in class and revisit these topics daily.`,
    })
  }

  if (avgSubjects.length > 0 && weakSubjects.length === 0) {
    const names = avgSubjects.map(s => s.name).join(", ")
    tips.push({
      icon: "💡",
      color: "#0891b2",
      bg: "#f0f9ff",
      border: "#bae6fd",
      title: "Subjects With Growth Potential",
      text: `With a bit more effort, the student can score much higher in: ${names}. Regular revision, practice tests, and clearing doubts with teachers can push these scores into the A range.`,
    })
  }

  // Attendance vs grades correlation
  if (attPct < 75 && avgPct < 60) {
    tips.push({
      icon: "🔗",
      color: "#be185d",
      bg: "#fdf2f8",
      border: "#fbcfe8",
      title: "Attendance & Performance Are Linked",
      text: `Both attendance and academic scores are below the recommended levels. Research shows that students who attend classes regularly score 20-30% higher on average. Improving attendance will directly and quickly improve academic results.`,
    })
  }

  // Positive reinforcement if doing well
  if (attPct >= 75 && avgPct >= 75 && weakSubjects.length === 0) {
    tips.push({
      icon: "🌟",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      title: "Great Overall Performance",
      text: `The student is performing well both in attendance (${attPct}%) and academics (${avgPct}%). Encourage continued dedication, participation in extracurricular activities, and setting even higher targets for the next term.`,
    })
  }

  return tips
}

export default function ReportCardModal({ studentId, onClose }) {
  const cardRef = useRef(null)
  const [student, setStudent]         = useState(null)
  const [grades, setGrades]           = useState([])
  const [attendance, setAttendance]   = useState(null)
  const [subjectAtt, setSubjectAtt]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError]             = useState("")

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    async function load() {
      try {
        const [sRes, gRes, aRes, saRes] = await Promise.all([
          getStudentAPI(studentId),
          getGradesAPI(studentId),
          attendanceSummaryAPI(studentId),
          subjectWiseAttendanceAPI(studentId).catch(() => ({ data: { subjects: [] } })),
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

  const { grouped, subjects, subjectStats, avgPct, finalGrade } = useMemo(() => {
    const grouped    = groupBySubject(grades)
    const subjects   = Object.keys(grouped)
    const totalMarks = grades.reduce((s, g) => s + g.marks, 0)
    const totalMax   = grades.reduce((s, g) => s + g.total_marks, 0)
    const avgPct     = totalMax > 0 ? parseFloat(((totalMarks / totalMax) * 100).toFixed(1)) : 0
    const finalGrade = overallGrade(avgPct)
    const subjectStats = subjects.map((sub) => {
      const tests  = grouped[sub]
      const earned = tests.reduce((s, g) => s + g.marks, 0)
      const max    = tests.reduce((s, g) => s + g.total_marks, 0)
      const pct    = max > 0 ? parseFloat(((earned / max) * 100).toFixed(1)) : 0
      return { name: sub, pct, grade: overallGrade(pct), earned, max }
    })
    return { grouped, subjects, subjectStats, avgPct, finalGrade }
  }, [grades])

  const attPct = attendance?.attendance_percentage ?? 0
  const present = attendance?.present ?? 0
  const total   = attendance?.total ?? 0

  const recommendations = useMemo(
    () => buildRecommendations(attPct, avgPct, subjectStats),
    [attPct, avgPct, subjectStats]
  )

  // Only show subject-wise attendance if data is meaningful
  const validSubjectAtt = subjectAtt.filter(s => s.total > 0)

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
          <div ref={cardRef} className="bg-white p-8 font-sans">

            {/* ── Header ── */}
            <div className="text-center border-b-2 border-blue-700 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-blue-800 tracking-wide">STUDENT REPORT CARD</h1>
              <p className="text-gray-500 text-sm mt-1">Academic Performance & Progress Report</p>
            </div>

            {/* ── Student Info ── */}
            <div className="flex gap-5 mb-6 bg-gray-50 rounded-xl p-4">
              {student?.photo
                ? <img src={student.photo} alt={student.name} className="w-24 h-28 rounded-lg object-cover border-2 border-gray-200 flex-shrink-0" />
                : <div className="w-24 h-28 rounded-lg bg-blue-100 flex items-center justify-center text-4xl flex-shrink-0">🎓</div>
              }
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 flex-1 text-sm">
                <Info label="Student ID"     value={student?.student_code} />
                <Info label="Name"           value={student?.name} />
                <Info label="Father Name"    value={student?.father_name} />
                <Info label="Course"         value={student?.course} />
                <Info label="Date of Birth"  value={student?.dob} />
                <Info label="Admission Date" value={student?.admission_date} />
                <Info label="Mobile"         value={student?.phone} />
                <Info label="Parent Mobile"  value={student?.parent_phone} />
              </div>
            </div>

            {/* ── Summary Boxes ── */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryBox label="Subjects Taken"  value={subjects.length}   color="#2563eb" />
              <SummaryBox label="Attendance"       value={`${attPct}%`}      color={attPct >= 75 ? "#16a34a" : attPct >= 50 ? "#ca8a04" : "#dc2626"} />
              <SummaryBox label="Academic Score"   value={`${avgPct}%`}      color="#7c3aed" />
              <SummaryBox label="Overall Grade"    value={finalGrade}        color={gradeColor(finalGrade)} />
            </div>

            {/* ── Attendance Summary ── */}
            <section className="mb-6">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b pb-1">
                Attendance Summary
              </h2>
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                {/* Circle indicator */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-full border-4"
                  style={{ borderColor: attPct >= 75 ? "#16a34a" : attPct >= 50 ? "#ca8a04" : "#dc2626" }}>
                  <span className="text-xl font-bold" style={{ color: attPct >= 75 ? "#16a34a" : attPct >= 50 ? "#ca8a04" : "#dc2626" }}>
                    {attPct}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Classes Attended</span>
                    <span className="font-semibold text-gray-800">{present} / {total}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(attPct, 100)}%`,
                        backgroundColor: attPct >= 75 ? "#16a34a" : attPct >= 50 ? "#ca8a04" : "#dc2626"
                      }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span className={attPct >= 75 ? "text-green-600 font-medium" : "text-orange-500 font-medium"}>
                      Required: 75%
                    </span>
                    <span>100%</span>
                  </div>
                  <p className="text-xs mt-2 font-medium"
                    style={{ color: attPct >= 75 ? "#16a34a" : attPct >= 50 ? "#ca8a04" : "#dc2626" }}>
                    {attPct >= 75 ? "✅ Attendance is satisfactory" : attPct >= 50 ? "⚠️ Below required attendance" : "❌ Critically low attendance"}
                  </p>
                </div>
              </div>

              {/* Subject-wise attendance — only if data exists and is meaningful */}
              {validSubjectAtt.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject-wise Attendance</p>
                  <div className="grid grid-cols-1 gap-2">
                    {validSubjectAtt.map((s) => (
                      <div key={s.subject} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium text-gray-700 w-36 flex-shrink-0">{s.subject}</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${Math.min(s.percentage, 100)}%`,
                              backgroundColor: s.percentage >= 75 ? "#16a34a" : s.percentage >= 50 ? "#ca8a04" : "#dc2626"
                            }} />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right"
                          style={{ color: s.percentage >= 75 ? "#16a34a" : s.percentage >= 50 ? "#ca8a04" : "#dc2626" }}>
                          {s.percentage}%
                        </span>
                        <span className="text-xs text-gray-400 w-16 text-right">{s.present}/{s.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── Academic Performance ── */}
            {subjects.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b pb-1">
                  Academic Performance
                </h2>

                {/* Subject score bars */}
                <div className="mb-4 grid grid-cols-1 gap-2">
                  {subjectStats.map((s) => (
                    <div key={s.name} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-700 w-36 flex-shrink-0 truncate">{s.name}</span>
                      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: `${Math.min(s.pct, 100)}%`,
                            backgroundColor: gradeColor(s.grade)
                          }} />
                      </div>
                      <span className="text-xs font-semibold w-12 text-right" style={{ color: gradeColor(s.grade) }}>
                        {s.pct}%
                      </span>
                      <span className="text-xs font-bold w-8 text-center rounded px-1 py-0.5"
                        style={{ color: gradeColor(s.grade), backgroundColor: gradeColor(s.grade) + "18" }}>
                        {s.grade}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Detailed test-wise breakdown */}
                {subjects.map((subject) => {
                  const tests  = grouped[subject]
                  const stat   = subjectStats.find(s => s.name === subject)
                  return (
                    <div key={subject} className="mb-4">
                      <div className="flex justify-between items-center bg-gray-100 px-3 py-1.5 rounded-t">
                        <span className="font-semibold text-gray-800 text-sm">{subject}</span>
                        <span className="text-xs font-bold" style={{ color: gradeColor(stat.grade) }}>
                          {stat.earned}/{stat.max} marks — {stat.pct}% ({stat.grade})
                        </span>
                      </div>
                      <table className="w-full text-xs border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-3 py-1.5 font-medium text-gray-500">Test / Exam</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">Marks Obtained</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">Total Marks</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">Score %</th>
                            <th className="text-center px-3 py-1.5 font-medium text-gray-500">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tests.map((g, i) => {
                            const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                            return (
                              <tr key={g.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-3 py-1.5">{g.test_title || "—"}</td>
                                <td className="px-3 py-1.5 text-center font-semibold">{g.marks}</td>
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

            {/* ── Parent Advisory ── */}
            {recommendations.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b pb-1">
                  📋 Parent's Advisory & Recommendations
                </h2>
                <div className="space-y-3">
                  {recommendations.map((tip, i) => (
                    <div key={i} className="rounded-xl p-4 border"
                      style={{ backgroundColor: tip.bg, borderColor: tip.border }}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0 mt-0.5">{tip.icon}</span>
                        <div>
                          <p className="text-sm font-bold mb-1" style={{ color: tip.color }}>{tip.title}</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{tip.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 italic">
                  * These recommendations are auto-generated based on the student's current attendance and academic data. Please consult the class teacher for personalised guidance.
                </p>
              </section>
            )}

            {/* ── Footer ── */}
            <div className="mt-6 pt-3 border-t flex justify-between text-xs text-gray-400">
              <span>Generated on {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
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
