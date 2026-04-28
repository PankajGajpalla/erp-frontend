import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getAdminsAPI, createAdminAPI, updateAdminAPI, deleteAdminAPI,
         getStaffAPI, createStaffAPI, updateStaffAPI, deleteStaffAPI } from "../api"

const EMPTY_FORM = { username: "", password: "", showPass: false }

export default function AdminAccounts() {
  const { user } = useAuth()

  const [admins, setAdmins]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState("")
  const [success, setSuccess]         = useState("")

  // Create form
  const [createForm, setCreateForm]   = useState(EMPTY_FORM)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState("")

  // Edit modal
  const [editModal, setEditModal]     = useState(null)   // admin object
  const [editForm, setEditForm]       = useState({ username: "", password: "", showPass: false })
  const [editError, setEditError]     = useState("")
  const [editSuccess, setEditSuccess] = useState("")
  const [saving, setSaving]           = useState(false)

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting, setDeleting]       = useState(false)

  // Staff state
  const [staffList, setStaffList]               = useState([])
  const [staffLoading, setStaffLoading]         = useState(true)
  const [staffError, setStaffError]             = useState("")
  const [staffSuccess, setStaffSuccess]         = useState("")
  const [staffOpen, setStaffOpen]               = useState(false)

  const [staffCreateForm, setStaffCreateForm]   = useState(EMPTY_FORM)
  const [staffCreating, setStaffCreating]       = useState(false)
  const [staffCreateError, setStaffCreateError] = useState("")

  const [staffEditModal, setStaffEditModal]     = useState(null)
  const [staffEditForm, setStaffEditForm]       = useState({ username: "", password: "", showPass: false })
  const [staffEditError, setStaffEditError]     = useState("")
  const [staffEditSuccess, setStaffEditSuccess] = useState("")
  const [staffSaving, setStaffSaving]           = useState(false)

  const [staffDeleteConfirmId, setStaffDeleteConfirmId] = useState(null)
  const [staffDeleting, setStaffDeleting]       = useState(false)

  useEffect(() => { loadAdmins(); loadStaff() }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  useEffect(() => {
    if (staffSuccess) { const t = setTimeout(() => setStaffSuccess(""), 3000); return () => clearTimeout(t) }
  }, [staffSuccess])

  async function loadStaff() {
    setStaffLoading(true)
    try {
      const res = await getStaffAPI()
      setStaffList(res.data.staff || [])
    } catch { setStaffError("Failed to load staff accounts") }
    finally { setStaffLoading(false) }
  }

  async function handleStaffCreate(e) {
    e.preventDefault()
    setStaffCreateError("")
    if (!staffCreateForm.username.trim()) { setStaffCreateError("Username is required"); return }
    if (staffCreateForm.username.trim().length < 3) { setStaffCreateError("Username must be at least 3 characters"); return }
    if (!staffCreateForm.password) { setStaffCreateError("Password is required"); return }
    if (staffCreateForm.password.length < 6) { setStaffCreateError("Password must be at least 6 characters"); return }

    setStaffCreating(true)
    try {
      await createStaffAPI({ username: staffCreateForm.username.trim(), password: staffCreateForm.password })
      setStaffSuccess("✅ New staff account created!")
      setStaffCreateForm(EMPTY_FORM)
      loadStaff()
    } catch (err) {
      setStaffCreateError(err.response?.data?.detail || "Failed to create staff account")
    } finally { setStaffCreating(false) }
  }

  function openStaffEdit(staff) {
    setStaffEditModal(staff)
    setStaffEditForm({ username: staff.username, password: "", showPass: false })
    setStaffEditError("")
    setStaffEditSuccess("")
  }

  async function handleStaffUpdate(e) {
    e.preventDefault()
    setStaffEditError("")
    if (!staffEditForm.username.trim()) { setStaffEditError("Username is required"); return }
    if (staffEditForm.username.trim().length < 3) { setStaffEditError("Username must be at least 3 characters"); return }
    if (staffEditForm.password && staffEditForm.password.length < 6) { setStaffEditError("Password must be at least 6 characters"); return }

    setStaffSaving(true)
    try {
      await updateStaffAPI(staffEditModal.id, {
        username: staffEditForm.username.trim(),
        password: staffEditForm.password || undefined,
      })
      setStaffEditSuccess("✅ Updated successfully!")
      loadStaff()
      setStaffEditModal(a => ({ ...a, username: staffEditForm.username.trim() }))
      setStaffEditForm(f => ({ ...f, password: "" }))
    } catch (err) {
      setStaffEditError(err.response?.data?.detail || "Failed to update")
    } finally { setStaffSaving(false) }
  }

  async function handleStaffDelete(id) {
    setStaffDeleting(true)
    try {
      await deleteStaffAPI(id)
      setStaffSuccess("✅ Staff account deleted!")
      setStaffDeleteConfirmId(null)
      loadStaff()
    } catch (err) {
      setStaffError(err.response?.data?.detail || "Delete failed")
      setStaffDeleteConfirmId(null)
    } finally { setStaffDeleting(false) }
  }

  async function loadAdmins() {
    setLoading(true)
    try {
      const res = await getAdminsAPI()
      setAdmins(res.data.admins || [])
    } catch { setError("Failed to load admin accounts") }
    finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError("")
    if (!createForm.username.trim()) { setCreateError("Username is required"); return }
    if (createForm.username.trim().length < 3) { setCreateError("Username must be at least 3 characters"); return }
    if (!createForm.password) { setCreateError("Password is required"); return }
    if (createForm.password.length < 6) { setCreateError("Password must be at least 6 characters"); return }

    setCreating(true)
    try {
      await createAdminAPI({ username: createForm.username.trim(), password: createForm.password })
      setSuccess("✅ New admin account created!")
      setCreateForm(EMPTY_FORM)
      loadAdmins()
    } catch (err) {
      setCreateError(err.response?.data?.detail || "Failed to create admin")
    } finally { setCreating(false) }
  }

  function openEdit(admin) {
    setEditModal(admin)
    setEditForm({ username: admin.username, password: "", showPass: false })
    setEditError("")
    setEditSuccess("")
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setEditError("")
    if (!editForm.username.trim()) { setEditError("Username is required"); return }
    if (editForm.username.trim().length < 3) { setEditError("Username must be at least 3 characters"); return }
    if (editForm.password && editForm.password.length < 6) { setEditError("Password must be at least 6 characters"); return }

    setSaving(true)
    try {
      await updateAdminAPI(editModal.id, {
        username: editForm.username.trim(),
        password: editForm.password || undefined,
      })
      setEditSuccess("✅ Updated successfully!")
      loadAdmins()
      // Update modal title too
      setEditModal(a => ({ ...a, username: editForm.username.trim() }))
      setEditForm(f => ({ ...f, password: "" }))
    } catch (err) {
      setEditError(err.response?.data?.detail || "Failed to update")
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await deleteAdminAPI(id)
      setSuccess("✅ Admin account deleted!")
      setDeleteConfirmId(null)
      loadAdmins()
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed")
      setDeleteConfirmId(null)
    } finally { setDeleting(false) }
  }

  const isSelf = (admin) => admin.username === user?.sub

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        <h2 className="text-xl font-bold text-slate-800 mb-1">Admin Accounts</h2>
        <p className="text-sm text-slate-500 mb-6">Manage administrator login credentials. Each admin has full access to the ERP.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-green-600 text-sm">{success}</div>
        )}

        {/* ── Create New Admin ── */}
        <div className="card p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-700 mb-4">➕ Create New Admin Account</h3>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Username <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Min 3 characters"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                className="inp w-52"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={createForm.showPass ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="inp w-52 pr-14"
                />
                <button type="button"
                  onClick={() => setCreateForm(f => ({ ...f, showPass: !f.showPass }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                  {createForm.showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button type="submit" disabled={creating}
              className="btn-primary">
              {creating ? "Creating..." : "Create Admin"}
            </button>
          </form>
          {createError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-600 text-sm">{createError}</div>
          )}
        </div>

        {/* ── Admin Accounts List ── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-700">All Admin Accounts</h3>
            <span className="text-xs text-slate-400">{admins.length} account{admins.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="p-10 flex items-center gap-3 text-slate-400 justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No admin accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3 font-medium">ID</th>
                  <th className="text-left px-6 py-3 font-medium">Username</th>
                  <th className="text-left px-6 py-3 font-medium">Role</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-t hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">{admin.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {admin.username.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">{admin.username}</p>
                          {isSelf(admin) && (
                            <span className="text-xs text-blue-500 font-medium">You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
                    </td>
                    <td className="px-6 py-4">
                      {deleteConfirmId === admin.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Delete {admin.username}?</span>
                          <button onClick={() => handleDelete(admin.id)} disabled={deleting}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition disabled:opacity-50">
                            {deleting ? "..." : "Yes, Delete"}
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className="bg-gray-200 hover:bg-gray-300 text-slate-700 px-3 py-1 rounded text-xs transition">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(admin)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                            ✏️ Edit
                          </button>
                          {!isSelf(admin) && (
                            <button onClick={() => setDeleteConfirmId(admin.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                              🗑️ Delete
                            </button>
                          )}
                          {isSelf(admin) && (
                            <span className="text-xs text-slate-400 italic self-center">Cannot delete own account</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* ── Staff Accounts Section ── */}
        <div className="mt-8">
          <button
            onClick={() => setStaffOpen(v => !v)}
            className="card w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition"
          >
            <span className="text-base font-semibold text-slate-700">👥 Staff Accounts</span>
            <span className="text-slate-400 text-sm">{staffOpen ? "▲ Collapse" : "▼ Expand"}</span>
          </button>

          {staffOpen && (
            <div className="mt-4 space-y-6">
              {staffError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{staffError}</div>
              )}
              {staffSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-600 text-sm">{staffSuccess}</div>
              )}

              {/* Create Staff */}
              <div className="card p-6">
                <h3 className="text-base font-semibold text-slate-700 mb-4">➕ Create New Staff Account</h3>
                <form onSubmit={handleStaffCreate} className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Username <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Min 3 characters"
                      value={staffCreateForm.username}
                      onChange={(e) => setStaffCreateForm({ ...staffCreateForm, username: e.target.value })}
                      className="inp w-52"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={staffCreateForm.showPass ? "text" : "password"}
                        placeholder="Min 6 characters"
                        value={staffCreateForm.password}
                        onChange={(e) => setStaffCreateForm({ ...staffCreateForm, password: e.target.value })}
                        className="inp w-52 pr-14"
                      />
                      <button type="button"
                        onClick={() => setStaffCreateForm(f => ({ ...f, showPass: !f.showPass }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                        {staffCreateForm.showPass ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={staffCreating}
                    className="btn-primary">
                    {staffCreating ? "Creating..." : "Create Staff"}
                  </button>
                </form>
                {staffCreateError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-600 text-sm">{staffCreateError}</div>
                )}
              </div>

              {/* Staff List */}
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-700">All Staff Accounts</h3>
                  <span className="text-xs text-slate-400">{staffList.length} account{staffList.length !== 1 ? "s" : ""}</span>
                </div>

                {staffLoading ? (
                  <div className="p-10 flex items-center gap-3 text-slate-400 justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">No staff accounts found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="text-left px-6 py-3 font-medium">ID</th>
                          <th className="text-left px-6 py-3 font-medium">Username</th>
                          <th className="text-left px-6 py-3 font-medium">Role</th>
                          <th className="text-left px-6 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map((s) => (
                          <tr key={s.id} className="border-t hover:bg-slate-50 transition">
                            <td className="px-6 py-4 text-slate-400 text-xs font-mono">{s.id}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                  {s.username.charAt(0).toUpperCase()}
                                </span>
                                <p className="font-medium text-slate-800">{s.username}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">Staff</span>
                            </td>
                            <td className="px-6 py-4">
                              {staffDeleteConfirmId === s.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-600 font-medium">Delete {s.username}?</span>
                                  <button onClick={() => handleStaffDelete(s.id)} disabled={staffDeleting}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition disabled:opacity-50">
                                    {staffDeleting ? "..." : "Yes, Delete"}
                                  </button>
                                  <button onClick={() => setStaffDeleteConfirmId(null)}
                                    className="bg-gray-200 hover:bg-gray-300 text-slate-700 px-3 py-1 rounded text-xs transition">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => openStaffEdit(s)}
                                    className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                                    ✏️ Edit
                                  </button>
                                  <button onClick={() => setStaffDeleteConfirmId(s.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                                    🗑️ Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Staff Edit Modal ── */}
        {staffEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">✏️ Edit Staff Account</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Editing: <span className="font-semibold text-slate-700">{staffEditModal.username}</span>
                  </p>
                </div>
                <button onClick={() => setStaffEditModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">×</button>
              </div>

              <form onSubmit={handleStaffUpdate} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={staffEditForm.username}
                    onChange={(e) => setStaffEditForm({ ...staffEditForm, username: e.target.value })}
                    className="inp"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={staffEditForm.showPass ? "text" : "password"}
                      placeholder="Leave blank to keep unchanged"
                      value={staffEditForm.password}
                      onChange={(e) => setStaffEditForm({ ...staffEditForm, password: e.target.value })}
                      className="inp pr-14"
                    />
                    <button type="button"
                      onClick={() => setStaffEditForm(f => ({ ...f, showPass: !f.showPass }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                      {staffEditForm.showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Minimum 6 characters if changing</p>
                </div>

                {staffEditError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-600 text-sm">{staffEditError}</div>
                )}
                {staffEditSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-green-600 text-sm">{staffEditSuccess}</div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={staffSaving}
                    className="btn-primary flex-1">
                    {staffSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button type="button" onClick={() => setStaffEditModal(null)}
                    className="btn-ghost flex-1">
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Modal ── */}
        {editModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">

              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">✏️ Edit Admin Account</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Editing: <span className="font-semibold text-slate-700">{editModal.username}</span>
                    {isSelf(editModal) && <span className="ml-2 text-xs text-blue-500">(You)</span>}
                  </p>
                </div>
                <button onClick={() => setEditModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">×</button>
              </div>

              <form onSubmit={handleUpdate} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="inp"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={editForm.showPass ? "text" : "password"}
                      placeholder="Leave blank to keep unchanged"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="inp pr-14"
                    />
                    <button type="button"
                      onClick={() => setEditForm(f => ({ ...f, showPass: !f.showPass }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                      {editForm.showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Minimum 6 characters if changing</p>
                </div>

                {editError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-600 text-sm">{editError}</div>
                )}
                {editSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-green-600 text-sm">{editSuccess}</div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="btn-primary flex-1">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button type="button" onClick={() => setEditModal(null)}
                    className="btn-ghost flex-1">
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
