import { useState } from 'react'
import {
  Container, Paper, Typography, TextField, Button,
  Box, Alert, CircularProgress
} from '@mui/material'
import { useAppSelector } from '../app/hooks'
import api from '../services/api'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'

export default function ProfilePage() {
  const { user } = useAppSelector((s) => s.auth)
  const [loading, setLoading] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  if (!user) return null

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await api.put('/auth/change-password', { oldPassword, newPassword })
      setStatus({ type: 'success', msg: res.data.message })
      setOldPassword('')
      setNewPassword('')
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to change password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper sx={{ p: 5 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <AccountCircleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>My Profile</Typography>
        </Box>

        <Box sx={{ mb: 4, bgcolor: 'background.default', p: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">Name</Typography>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>{user.nama}</Typography>
          
          <Typography variant="subtitle2" color="text.secondary">Email</Typography>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>{user.email}</Typography>

          <Typography variant="subtitle2" color="text.secondary">Role</Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>{user.role}</Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Change Password</Typography>
        
        {status && <Alert severity={status.type} sx={{ mb: 2 }}>{status.msg}</Alert>}

        <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required fullWidth
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading || !oldPassword || !newPassword} sx={{ mt: 1 }}>
            {loading ? <CircularProgress size={24} /> : 'Update Password'}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
