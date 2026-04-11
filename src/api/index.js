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

// ─── Dashboard ───────────────────────────────────────────────
export const getDashboardSummaryAPI = () => API.get("/dashboard/summary");

// ─── Students ────────────────────────────────────────────────
export const getStudentsAPI = () => API.get("/students");
export const getStudentAPI = (id) => API.get(`/student/${id}`);
export const addStudentAPI = (data) => API.post("/add_student", data);
export const updateStudentAPI = (id, data) => API.put(`/update_student/${id}`, data);
export const deleteStudentAPI = (id) => API.delete(`/delete_student/${id}`);
export const importStudentsAPI = (data) => API.post("/import_students", data);

// ─── Attendance ──────────────────────────────────────────────
export const getAttendanceAPI = () => API.get("/attendance");
export const getStudentAttendanceAPI = (id) => API.get(`/attendance/${id}`);
export const markAttendanceAPI = (data) => API.post("/mark_attendance", data);
export const attendanceSummaryAPI = (id) => API.get(`/attendance/summary/${id}`);
export const markAttendanceBulkAPI = (data) => API.post("/mark_attendance_bulk", data);

// ─── Fees ────────────────────────────────────────────────────
export const getFeesAPI = (id) => API.get(`/fees/${id}`);
export const addFeesAPI = (data) => API.post("/add_fees", data);
export const payFeesAPI = (id, data) => API.put(`/pay_fees/${id}`, data);
export const feesSummaryAPI = (id) => API.get(`/fees/summary/${id}`);

// ─── Teachers ────────────────────────────────────────────────
export const getTeachersAPI = () => API.get("/teachers");
export const addTeacherAPI = (data) => API.post("/add_teacher", data);
export const updateTeacherAPI = (id, data) => API.put(`/update_teacher/${id}`, data);
export const deleteTeacherAPI = (id) => API.delete(`/delete_teacher/${id}`);
export const createTeacherLoginAPI = (data) => API.post("/create_teacher_login", data);
export const getStudentsByCourseAPI = (course) => API.get(`/students/course/${course}`);
export const getTeacherMeAPI = () => API.get("/teacher/me");

// ─── Grades ──────────────────────────────────────────────────
export const getGradesAPI = (id) => API.get(`/grades/${id}`);
export const addGradeAPI = (data) => API.post("/add_grade", data);
export const deleteGradeAPI = (id) => API.delete(`/delete_grade/${id}`);

// ─── Timetable ───────────────────────────────────────────────
export const getTimetableAPI = () => API.get("/timetable");
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
