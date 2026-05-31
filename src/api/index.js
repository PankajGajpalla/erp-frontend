import axios from "axios";

// ✅ Use environment variable for base URL
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://erp-backend-37nj.onrender.com",
});

// ✅ Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ Auto logout on 401 (token expired)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────
export const loginAPI = (data) => API.post("/login", data);
export const registerAPI = (data) => API.post("/register", data);
export const createAdminAPI = (data) => API.post("/create_admin", data);
export const getAdminsAPI = () => API.get("/admins");
export const updateAdminAPI = (id, data) => API.put(`/admins/${id}`, data);
export const deleteAdminAPI = (id) => API.delete(`/admins/${id}`);

// ─── Dashboard ───────────────────────────────────────────────
export const getDashboardSummaryAPI = () => API.get("/dashboard/summary");
export const getDashboardChartsAPI  = () => API.get("/dashboard/charts");
export const getAttendanceReportAPI = () => API.get("/attendance/report");

// ─── Students ────────────────────────────────────────────────
export const getStudentsAPI = () => API.get("/students");
export const searchStudentsAPI = (q) => API.get("/students/search", { params: { q } });
export const getStudentAPI = (id) => API.get(`/student/${id}`);
export const getStudentAdditionalCoursesAPI = (id) => API.get(`/student/${id}/additional-courses`);
export const setStudentAdditionalCoursesAPI = (id, data) => API.put(`/student/${id}/additional-courses`, data);
export const addStudentAPI = (data) => API.post("/add_student", data);
export const updateStudentAPI = (id, data) => API.put(`/update_student/${id}`, data);
export const deleteStudentAPI = (id) => API.delete(`/delete_student/${id}`);
export const importStudentsAPI = (data) => API.post("/import_students", data);

// ─── Attendance ──────────────────────────────────────────────
export const getAttendanceAPI = () => API.get("/attendance");
export const getStudentAttendanceAPI = (id, params = {}) => API.get(`/attendance/${id}`, { params });
export const markAttendanceAPI = (data) => API.post("/mark_attendance", data);
export const attendanceSummaryAPI = (id) => API.get(`/attendance/summary/${id}`);
export const markAttendanceBulkAPI  = (data) => API.post("/mark_attendance_bulk", data)
export const checkAttendanceBulkAPI = (data) => API.post("/attendance/check", data);

// ─── Fees ────────────────────────────────────────────────────
export const getFeesAPI = (id) => API.get(`/fees/${id}`);
export const addFeesAPI = (data) => API.post("/add_fees", data);
export const payFeesAPI = (id, data) => API.put(`/pay_fees/${id}`, data);
export const updateFeeRecordAPI = (feeId, data) => API.put(`/fees/record/${feeId}`, data);
export const deleteFeeRecordAPI = (feeId) => API.delete(`/fees/record/${feeId}`);
export const feesSummaryAPI = (id) => API.get(`/fees/summary/${id}`);
export const getFeePaymentsAPI = (feeId) => API.get(`/fee_payments/${feeId}`);
export const getOverdueFeesAPI = () => API.get("/fees/overdue");

// ─── Teachers ────────────────────────────────────────────────
export const getTeachersAPI = () => API.get("/teachers");
export const addTeacherAPI = (data) => API.post("/add_teacher", data);
export const updateTeacherAPI = (id, data) => API.put(`/update_teacher/${id}`, data);
export const deleteTeacherAPI = (id) => API.delete(`/delete_teacher/${id}`);
export const createTeacherLoginAPI = (data) => API.post("/create_teacher_login", data);
export const getTeacherCredentialsAPI = (id) => API.get(`/teacher/${id}/credentials`);
export const updateTeacherCredentialsAPI = (id, data) => API.put(`/teacher/${id}/credentials`, data);
export const getStudentCredentialsAPI = (id) => API.get(`/student/${id}/credentials`);
export const updateStudentCredentialsAPI = (id, data) => API.put(`/student/${id}/credentials`, data);
export const getStudentsByCourseAPI = (course) => API.get(`/students/course/${course}`);
export const getTeacherMeAPI = () => API.get("/teacher/me");
export const getSubjectsByTeacherAPI = (teacherId) => API.get(`/subjects/teacher/${teacherId}`);
export const assignSubjectsToTeacherAPI = (teacherId, data) => API.put(`/teachers/${teacherId}/subjects`, data);

// ─── Grades ──────────────────────────────────────────────────
export const getGradesAPI = (id) => API.get(`/grades/${id}`);
export const addGradeAPI = (data) => API.post("/add_grade", data);
export const deleteGradeAPI = (id) => API.delete(`/delete_grade/${id}`);

// ─── Timetable ───────────────────────────────────────────────
export const getTimetableAPI = () => API.get("/timetable");
export const getTimetableByCourseAPI = (courseId) => API.get(`/timetable/course/${courseId}`);
export const getMyTimetableAPI = () => API.get("/timetable/teacher/me");
export const addTimetableAPI = (data) => API.post("/add_timetable", data);
export const deleteTimetableAPI = (id) => API.delete(`/delete_timetable/${id}`);

// ─── Notices ─────────────────────────────────────────────────
export const getNoticesAPI = () => API.get("/notices");
export const addNoticeAPI = (data) => API.post("/add_notice", data);
export const deleteNoticeAPI = (id) => API.delete(`/delete_notice/${id}`);

// ─── Courses ─────────────────────────────────────────────────
export const getCoursesAPI = () => API.get("/courses");
export const addCourseAPI = (data) => API.post("/add_course", data);
export const updateCourseAPI = (id, data) => API.put(`/update_course/${id}`, data);
export const deleteCourseAPI = (id) => API.delete(`/delete_course/${id}`);

// ─── Bulk Operations ─────────────────────────────────────────
export const bulkUpdateCourseAPI = (data) => API.put("/students/bulk-update-course", data);
export const addBulkFeesAPI = (data) => API.post("/fees/bulk", data);

// ─── Subjects ────────────────────────────────────────────────
export const getSubjectsAPI = () => API.get("/subjects");
export const getSubjectsByCourseAPI = (courseId) => API.get(`/subjects/course/${courseId}`);
export const addSubjectAPI = (data) => API.post("/add_subject", data);
export const updateSubjectAPI = (id, data) => API.put(`/update_subject/${id}`, data);
export const deleteSubjectAPI = (id) => API.delete(`/delete_subject/${id}`);
export const subjectWiseAttendanceAPI = (studentId) => API.get(`/attendance/subject-wise/${studentId}`);

// ─── Fee Templates ───────────────────────────────────────────
export const getFeeTemplatesAPI = () => API.get("/fee-templates");
export const createFeeTemplateAPI = (data) => API.post("/fee-templates", data);
export const deleteFeeTemplateAPI = (id) => API.delete(`/fee-templates/${id}`);

// ─── Exam Schedule ───────────────────────────────────────────
export const getExamScheduleAPI = (courseId) => API.get("/exam-schedule", { params: courseId ? { course_id: courseId } : {} });
export const createExamAPI = (data) => API.post("/exam-schedule", data);
export const updateExamAPI = (id, data) => API.put(`/exam-schedule/${id}`, data);
export const deleteExamAPI = (id) => API.delete(`/exam-schedule/${id}`);

// ─── Audit Logs ──────────────────────────────────────────────
export const getAuditLogsAPI = (limit = 100) => API.get("/audit-logs", { params: { limit } });

// ─── Notice Reads ────────────────────────────────────────────
export const markNoticeReadAPI = (noticeId) => API.post(`/notices/${noticeId}/read`)
export const getNoticeReadsAPI = (noticeId) => API.get(`/notices/${noticeId}/reads`)

// ─── Attendance Heatmap ──────────────────────────────────────
export const getAttendanceHeatmapAPI = (studentId) => API.get(`/attendance/heatmap/${studentId}`)

// ─── Data Export ─────────────────────────────────────────────
export const exportStudentsAPI = () => API.get("/export/students")
export const exportFeesAPI = () => API.get("/export/fees")
export const exportAttendanceAPI = () => API.get("/export/attendance")
export const exportPaymentsAPI = () => API.get("/export/payments")

// ─── Staff ───────────────────────────────────────────────────
export const createStaffAPI = (data) => API.post("/create_staff", data)
export const getStaffAPI = () => API.get("/staff")
export const updateStaffAPI = (id, data) => API.put(`/staff/${id}`, data)
export const deleteStaffAPI = (id) => API.delete(`/staff/${id}`)
export const getStaffDashboardAPI = () => API.get("/dashboard/staff-summary")


// ─── Grievances ───────────────────────────────────────────────
export const submitGrievanceAPI   = (data)            => API.post("/grievances", data)
export const getMyGrievancesAPI   = ()                => API.get("/grievances/my")
export const getAllGrievancesAPI   = (status = "")    => API.get("/grievances", { params: status ? { status } : {} })
export const replyGrievanceAPI    = (id, data)        => API.put(`/grievances/${id}/reply`, data)
export const resolveGrievanceAPI  = (id)              => API.patch(`/grievances/${id}/resolve`)
export const reopenGrievanceAPI   = (id)              => API.patch(`/grievances/${id}/reopen`)

// ─── Inquiries ────────────────────────────────────────────────
export const getInquiriesAPI        = (params = {})  => API.get("/inquiries", { params })
export const getInquiryAPI          = (id)           => API.get(`/inquiries/${id}`)
export const createInquiryAPI       = (data)         => API.post("/inquiries", data)
export const updateInquiryAPI       = (id, data)     => API.put(`/inquiries/${id}`, data)
export const deleteInquiryAPI       = (id)           => API.delete(`/inquiries/${id}`)
export const admitInquiryAPI        = (id)           => API.post(`/inquiries/${id}/admit`)
export const addFollowUpAPI         = (id, data)     => API.post(`/inquiries/${id}/followup`, data)
export const getPendingFollowUpsAPI = ()             => API.get("/inquiries/pending/followup")
export const getInquiryStatsAPI     = ()             => API.get("/inquiries/stats/summary")
export const inquiryBulkSmsAPI      = (data)         => API.post("/inquiries/bulk-sms", data)
