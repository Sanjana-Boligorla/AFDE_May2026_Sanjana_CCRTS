import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const ROLE_COLORS = {
  Admin:'bg-red-100 text-red-700', Supervisor:'bg-purple-100 text-purple-700',
  Agent:'bg-blue-100 text-blue-700', Customer:'bg-green-100 text-green-700',
}

export default function Profile() {
  const { user, fetchMe } = useAuth()
  const [loading, setLoading]     = useState(true)
  const [profile, setProfile]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [showPw, setShowPw]       = useState(false)

  const profileForm  = useForm()
  const passwordForm = useForm()

  useEffect(() => {
    api.get('/users/profile').then(r => {
      setProfile(r.data.data.user)
      profileForm.reset({ name: r.data.data.user.name, phone: r.data.data.user.phone || '' })
    }).catch(() => toast.error('Failed to load profile'))
    .finally(() => setLoading(false))
  }, [])

  const handleProfileUpdate = async (data) => {
    setSaving(true)
    try {
      await api.put('/users/profile', data)
      toast.success('Profile updated successfully')
      await fetchMe()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally { setSaving(false) }
  }

  const handlePasswordChange = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPw(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('Password changed successfully')
      passwordForm.reset()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed')
    } finally { setChangingPw(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="h-10 w-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your account information and security settings.</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{profile?.name}</h2>
            <p className="text-gray-500 text-sm">{profile?.email}</p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 inline-block ${ROLE_COLORS[profile?.role]}`}>
              {profile?.role}
            </span>
          </div>
        </div>

        <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input className="input-field" {...profileForm.register('name', { required: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input className="input-field" placeholder="+1-555-0000" {...profileForm.register('phone')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input className="input-field bg-gray-50" value={profile?.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact admin for assistance.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Member Since</label>
            <input className="input-field bg-gray-50" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : ''} disabled />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password Change */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input-field pr-10"
                placeholder="Enter current password"
                {...passwordForm.register('currentPassword', { required: true })} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input type={showPw ? 'text' : 'password'} className="input-field"
                placeholder="Min 8 chars"
                {...passwordForm.register('newPassword', { required: true, minLength: 8 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input type={showPw ? 'text' : 'password'} className="input-field"
                placeholder="Repeat new password"
                {...passwordForm.register('confirmPassword', { required: true })} />
            </div>
          </div>
          <button type="submit" disabled={changingPw} className="btn-primary">
            {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Last Login */}
      {profile?.last_login && (
        <div className="card p-4 bg-gray-50 flex items-center gap-3">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-500">
            Last login: <span className="font-medium text-gray-700">{new Date(profile.last_login).toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  )
}
