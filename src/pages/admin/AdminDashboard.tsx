import { useEffect, useState } from 'react'
import {
  Container, Typography, Grid, Paper, Box, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PeopleIcon from '@mui/icons-material/People'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import MovieIcon from '@mui/icons-material/Movie'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchAdminStats, fetchIncome, fetchAdminOrders, fetchAdminUsers, updateUserRole } from '../../features/admin/adminSlice'
import { fetchMovies, createMovie, deleteMovie } from '../../features/movies/moviesSlice'
import { fetchSchedules, createSchedule, deleteSchedule } from '../../features/schedules/schedulesSlice'
import api from '../../services/api'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  sub?: string
}

function StatCard({ title, value, icon, color, sub }: StatCardProps) {
  return (
    <Paper sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
      <Box sx={{ bgcolor: color, p: 1.5, borderRadius: 2, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </Paper>
  )
}

export default function AdminDashboard() {
  const dispatch = useAppDispatch()
  const { stats, income, orders, users } = useAppSelector((s) => s.admin)
  const { items: movies } = useAppSelector((s) => s.movies)
  const { items: schedules } = useAppSelector((s) => s.schedules)
  const [tab, setTab] = useState(0)
  const [period, setPeriod] = useState('daily')
  const [halls, setHalls] = useState<any[]>([])

  // Movie form state
  const [movieDialog, setMovieDialog] = useState(false)
  const [movieForm, setMovieForm] = useState({ title: '', genre: '', duration_min: 120, poster_url: '', description: '', status: 'now_showing', rating: 7 })

  // Schedule form state
  const [schedDialog, setSchedDialog] = useState(false)
  const [schedForm, setSchedForm] = useState<{ movie_id: string; hall_id: string; start_time: string; price_regular: number; price_vip: number }>({ movie_id: '', hall_id: '', start_time: '', price_regular: 50000, price_vip: 100000 })

  useEffect(() => {
    dispatch(fetchAdminStats())
    dispatch(fetchAdminOrders(undefined))
    dispatch(fetchAdminUsers())
    dispatch(fetchMovies({}))
    dispatch(fetchSchedules(undefined))
    // Fetch halls for schedule creation
    api.get('/cinemas').then(async (res) => {
      const cinemas = res.data.cinemas || []
      const hallRequests = cinemas.map((cinema: any) =>
        api.get(`/cinemas/${cinema.id}/halls`).then((h) =>
          (h.data.halls || []).map((hall: any) => ({ ...hall, cinema_name: cinema.name }))
        ).catch(() => [])
      )
      const results = await Promise.all(hallRequests)
      setHalls(results.flat())
    }).catch(() => {})
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchIncome({ period, days: 30 }))
  }, [dispatch, period])

  const handleCreateMovie = async () => {
    const result = await dispatch(createMovie(movieForm as any))
    if (createMovie.fulfilled.match(result)) { setMovieDialog(false); setMovieForm({ title: '', genre: '', duration_min: 120, poster_url: '', description: '', status: 'now_showing', rating: 7 }) }
  }

  const handleCreateSchedule = async () => {
    const result = await dispatch(createSchedule(schedForm))
    if (createSchedule.fulfilled.match(result)) { setSchedDialog(false) }
  }

  const tabLabels = ['Overview', 'Movies', 'Schedules', 'Orders', 'Users']

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>Admin Panel</Typography>
          <Typography color="text.secondary">CineMax Management Dashboard</Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 4 }}>
        {tabLabels.map((l) => <Tab key={l} label={l} />)}
      </Tabs>

      {/* OVERVIEW */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Revenue" icon={<TrendingUpIcon sx={{ color: 'white' }} />}
                value={`Rp${(stats?.total_revenue || 0).toLocaleString()}`}
                color="#e50914" sub={`Today: Rp${(stats?.today_revenue || 0).toLocaleString()}`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total Users" icon={<PeopleIcon sx={{ color: 'white' }} />}
                value={stats?.total_users || 0} color="#1976d2"
                sub={`${stats?.today_orders || 0} orders today`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Orders Paid" icon={<ConfirmationNumberIcon sx={{ color: 'white' }} />}
                value={stats?.orders?.paid || 0} color="#388e3c"
                sub={`${stats?.orders?.used || 0} used`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Movies" icon={<MovieIcon sx={{ color: 'white' }} />}
                value={stats?.total_movies || 0} color="#7b1fa2" />
            </Grid>
          </Grid>

          {/* Revenue Chart */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Revenue Trend</Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={income}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e50914" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fontSize: 11 }} tickFormatter={(v) => `Rp${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`Rp${Number(v).toLocaleString()}`, 'Revenue']} labelStyle={{ color: '#fff' }} contentStyle={{ background: '#141414', border: '1px solid #333' }} />
                <Area type="monotone" dataKey="revenue" stroke="#e50914" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Orders per Day</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={income}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#141414', border: '1px solid #333' }} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="orders" fill="#f5c518" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      )}

      {/* MOVIES */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" onClick={() => setMovieDialog(true)}>+ Add Movie</Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Movie</TableCell>
                  <TableCell>Genre</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movies.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="img" src={m.poster_url} sx={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 0.5 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.title}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{m.genre}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{m.duration_min}m</Typography></TableCell>
                    <TableCell><Typography variant="body2">{m.rating}</Typography></TableCell>
                    <TableCell>
                      <Chip label={m.status} size="small"
                        color={m.status === 'now_showing' ? 'success' : m.status === 'coming_soon' ? 'warning' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => dispatch(deleteMovie(m.id))}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add Movie Dialog */}
          <Dialog open={movieDialog} onClose={() => setMovieDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Movie</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
              <TextField label="Title" value={movieForm.title} onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })} required fullWidth />
              <TextField label="Genre" value={movieForm.genre} onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })} fullWidth />
              <TextField label="Duration (min)" type="number" value={movieForm.duration_min} onChange={(e) => setMovieForm({ ...movieForm, duration_min: Number(e.target.value) })} fullWidth />
              <TextField label="Rating (0-10)" type="number" value={movieForm.rating} onChange={(e) => setMovieForm({ ...movieForm, rating: Number(e.target.value) })} fullWidth inputProps={{ min: 0, max: 10, step: 0.1 }} />
              <TextField label="Poster URL" value={movieForm.poster_url} onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })} fullWidth />
              <TextField label="Description" value={movieForm.description} onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })} fullWidth multiline rows={3} />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={movieForm.status} label="Status" onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })}>
                  <MenuItem value="now_showing">Now Showing</MenuItem>
                  <MenuItem value="coming_soon">Coming Soon</MenuItem>
                  <MenuItem value="ended">Ended</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMovieDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateMovie}>Create</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* SCHEDULES */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" onClick={() => setSchedDialog(true)}>+ Add Schedule</Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Movie</TableCell>
                  <TableCell>Cinema / Hall</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>Price (Regular)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map((sc) => (
                  <TableRow key={sc.id}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{sc.movie_title}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{sc.cinema_name} · {sc.hall_name}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{new Date(sc.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</Typography></TableCell>
                    <TableCell><Typography variant="body2">Rp{Number(sc.price_regular).toLocaleString()}</Typography></TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => dispatch(deleteSchedule(sc.id))}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add Schedule Dialog */}
          <Dialog open={schedDialog} onClose={() => setSchedDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
              <FormControl fullWidth>
                <InputLabel>Movie</InputLabel>
                <Select value={schedForm.movie_id} label="Movie" onChange={(e) => setSchedForm({ ...schedForm, movie_id: e.target.value })}>
                  {movies.map((m) => <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Hall</InputLabel>
                <Select value={schedForm.hall_id} label="Hall" onChange={(e) => setSchedForm({ ...schedForm, hall_id: e.target.value })}>
                  {halls.map((h: any) => <MenuItem key={h.id} value={h.id}>{h.cinema_name} — {h.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Start Time" type="datetime-local" value={schedForm.start_time}
                onChange={(e) => setSchedForm({ ...schedForm, start_time: e.target.value })}
                InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Price Regular (Rp)" type="number" value={schedForm.price_regular}
                onChange={(e) => setSchedForm({ ...schedForm, price_regular: Number(e.target.value) })} fullWidth />
              <TextField label="Price VIP (Rp)" type="number" value={schedForm.price_vip}
                onChange={(e) => setSchedForm({ ...schedForm, price_vip: Number(e.target.value) })} fullWidth />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSchedDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateSchedule}>Create</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ORDERS */}
      {tab === 3 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Movie</TableCell>
                <TableCell>Showtime</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{o.id.slice(0, 8).toUpperCase()}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{o.username}<br /><span style={{ color: '#888', fontSize: 12 }}>{o.email}</span></Typography></TableCell>
                  <TableCell><Typography variant="body2">{o.movie_title}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{new Date(o.start_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>Rp{Number(o.total_price).toLocaleString()}</Typography></TableCell>
                  <TableCell>
                    <Chip label={o.status} size="small"
                      color={o.status === 'paid' ? 'success' : o.status === 'used' ? 'default' : o.status === 'cancelled' ? 'error' : 'warning'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* USERS */}
      {tab === 4 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Orders</TableCell>
                <TableCell>Total Spent</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.username}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : 'default'} />
                  </TableCell>
                  <TableCell>{u.total_orders}</TableCell>
                  <TableCell>Rp{Number(u.total_spent).toLocaleString()}</TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <Button
                      size="small" variant="outlined"
                      onClick={() => dispatch(updateUserRole({ id: u.id, role: u.role === 'admin' ? 'user' : 'admin' }))}
                    >
                      {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
