import {
  AppBar, Toolbar, Typography, Button, IconButton,
  Box, Avatar, Menu, MenuItem, Divider, Chip,
} from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'

export default function Navbar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((s) => s.auth)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleLogout = () => {
    dispatch(logout())
    setAnchorEl(null)
    navigate('/')
  }

  const userInitial = (user?.nama?.trim()?.[0] || user?.email?.trim()?.[0] || 'U').toUpperCase()

  return (
    <AppBar position="sticky" sx={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)' }}>
      <Toolbar>
        <MovieIcon sx={{ color: 'primary.main', mr: 1, fontSize: 30 }} />
        <Typography
          variant="h6" component={RouterLink} to="/"
          sx={{ fontWeight: 900, color: 'white', textDecoration: 'none', letterSpacing: 1, flexGrow: 0, mr: 4 }}
        >
          CINEMAX
        </Typography>

        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          <Button color="inherit" component={RouterLink} to="/">Home</Button>
          <Button color="inherit" component={RouterLink} to="/movies">Movies</Button>
          <Button color="inherit" component={RouterLink} to="/schedule">Schedule</Button>
          <Button color="inherit" component={RouterLink} to="/cinema">Cinemas</Button>
          <Button color="inherit" component={RouterLink} to="/verify">Verify Ticket</Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user ? (
            <>
              {user.role === 'Admin' && (
                <Chip label="Admin" size="small" color="primary" sx={{ mr: 1 }} />
              )}
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 14 }}>
                  {userInitial}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { navigate('/tickets'); setAnchorEl(null) }}>My Tickets</MenuItem>
                {user.role === 'Admin' && (
                  <MenuItem onClick={() => { navigate('/admin'); setAnchorEl(null) }}>Admin Panel</MenuItem>
                )}
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button variant="outlined" color="inherit" component={RouterLink} to="/login" size="small">
                Login
              </Button>
              <Button variant="contained" color="primary" component={RouterLink} to="/register" size="small">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
