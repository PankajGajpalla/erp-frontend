import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext();

// Helper to decode and validate JWT token
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    if (payload.exp < currentTime) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = decodeToken(token);
      if (payload) {
        setUser(payload);
      } else {
        // Token expired or invalid — clean up
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token) => {
    const payload = decodeToken(token)
    if (!payload) {
      throw new Error("Invalid token received from server")
    }
    localStorage.setItem("token", token)
    setUser(payload)
    return payload  // ✅ return payload so Login.jsx can redirect based on role
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  // ✅ Helper role checks — use these in components instead of user?.role === "admin"
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isStaff = user?.role === "staff";

  // ✅ Check if token is still valid (useful for protected routes)
  const isAuthenticated = () => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    return decodeToken(token) !== null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      isTeacher,
      isStudent,
      isStaff,
      isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}