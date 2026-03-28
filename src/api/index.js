import axios from "axios";

const API = axios.create({
  baseURL: "https://erp-backend-37nj.onrender.com",
});

// Automatically attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const loginAPI = (data) => API.post("/login", data);
export const registerAPI = (data) => API.post("/register", data);

// Students
export const getStudentsAPI = () => API.get("/students");
export const getStudentAPI = (id) => API.get(`/student/${id}`);
export const addStudentAPI = (data) => API.post("/add_student", data);
export const updateStudentAPI = (id, data) => API.put(`/update_student/${id}`, data);
export const deleteStudentAPI = (id) => API.delete(`/delete_student/${id}`);

// Attendance
export const getAttendanceAPI = () => API.get("/attendance");
export const getStudentAttendanceAPI = (id) => API.get(`/attendance/${id}`);
export const markAttendanceAPI = (data) => API.post("/mark_attendance", data);
export const attendanceSummaryAPI = (id) => API.get(`/attendance/summary/${id}`);

// Fees
export const getFeesAPI = (id) => API.get(`/fees/${id}`)
export const addFeesAPI = (data) => API.post("/add_fees", data)
export const payFeesAPI = (id, data) => API.put(`/pay_fees/${id}`, data)
export const feesSummaryAPI = (id) => API.get(`/fees/summary/${id}`)


// Teachers
export const getTeachersAPI = () => API.get("/teachers")
export const addTeacherAPI = (data) => API.post("/add_teacher", data)
export const updateTeacherAPI = (id, data) => API.put(`/update_teacher/${id}`, data)
export const deleteTeacherAPI = (id) => API.delete(`/delete_teacher/${id}`)

// Grades
export const getGradesAPI = (id) => API.get(`/grades/${id}`)
export const addGradeAPI = (data) => API.post("/add_grade", data)
export const deleteGradeAPI = (id) => API.delete(`/delete_grade/${id}`)

// Timetable
export const getTimetableAPI = () => API.get("/timetable")
export const addTimetableAPI = (data) => API.post("/add_timetable", data)
export const deleteTimetableAPI = (id) => API.delete(`/delete_timetable/${id}`)

// Notices
export const getNoticesAPI = () => API.get("/notices")
export const addNoticeAPI = (data) => API.post("/add_notice", data)
export const deleteNoticeAPI = (id) => API.delete(`/delete_notice/${id}`)

// Import
export const importStudentsAPI = (data) => API.post("/import_students", data)