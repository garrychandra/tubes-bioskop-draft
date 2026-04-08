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
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

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
  const [cinemas, setCinemas] = useState<any[]>([])
  const [noShowData, setNoShowData] = useState<any[]>([])

  // Movie form state
  const [movieDialog, setMovieDialog] = useState(false)
  const [movieForm, setMovieForm] = useState<{ judul: string; genre: string; durasi: number; poster_url: string; deskripsi: string; status: 'now_showing' | 'coming_soon' | 'ended' }>({ judul: '', genre: '', durasi: 120, poster_url: '', deskripsi: '', status: 'now_showing' })

  // Schedule form state
  const [schedDialog, setSchedDialog] = useState(false)
  const [schedForm, setSchedForm] = useState<{ id_film: string; id_studio: string; jam_tayang: string; harga_tiket: number }>({ id_film: '', id_studio: '', jam_tayang: '', harga_tiket: 50000 })

  // Cinema & Studio forms
  const [cinemaDialog, setCinemaDialog] = useState(false)
  const [cinemaForm, setCinemaForm] = useState({ nama_bioskop: '', lokasi: '', image_url: '' })
  const [studioDialog, setStudioDialog] = useState(false)
  const [studioForm, setStudioForm] = useState({ id_bioskop: '', nama_studio: '', kapasitas: 80 })

  const fetchCinemas = () => {
    api.get('/bioskop').then(res => setCinemas(res.data.bioskop || [])).catch(() => {})
  }

  useEffect(() => {
    dispatch(fetchAdminStats())
    dispatch(fetchAdminOrders(undefined))
    dispatch(fetchAdminUsers())
    dispatch(fetchMovies({}))
    dispatch(fetchSchedules(undefined))
    fetchCinemas()
    api.get('/admin/noshows', { params: { days: 14 } })
      .then(res => setNoShowData(res.data.noshows || []))
      .catch(() => {})
    // Fetch halls for schedule creation
    api.get('/bioskop').then(async (res) => {
      const bioskop = res.data.bioskop || []
      const hallRequests = bioskop.map((b: any) =>
        api.get(`/bioskop/${b.id_bioskop}/studios`).then((h) =>
          (h.data.studios || []).map((studio: any) => ({ ...studio, nama_bioskop: b.nama_bioskop }))
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
    if (createMovie.fulfilled.match(result)) { setMovieDialog(false); setMovieForm({ judul: '', genre: '', durasi: 120, poster_url: '', deskripsi: '', status: 'now_showing' }) }
  }

  const handleCreateSchedule = async () => {
    const result = await dispatch(createSchedule(schedForm))
    if (createSchedule.fulfilled.match(result)) { setSchedDialog(false) }
  }

  const handleCreateCinema = async () => {
    try {
      await api.post('/bioskop', cinemaForm)
      setCinemaDialog(false)
      setCinemaForm({ nama_bioskop: '', lokasi: '', image_url: '' })
      fetchCinemas()
    } catch (err) {}
  }

  const handleCreateStudio = async () => {
    try {
      await api.post(`/bioskop/${studioForm.id_bioskop}/studios`, {
        nama_studio: studioForm.nama_studio,
        kapasitas: studioForm.kapasitas
      })
      setStudioDialog(false)
      setStudioForm({ id_bioskop: '', nama_studio: '', kapasitas: 80 })
    } catch (err) {}
  }

  const tabLabels = ['Overview', 'Movies', 'Schedules', 'Orders', 'Users', 'Cinemas']

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
                value={stats?.tiket?.active || 0} color="#388e3c"
                sub={`${stats?.tiket?.used || 0} used`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Movies" icon={<MovieIcon sx={{ color: 'white' }} />}
                value={stats?.total_films || 0} color="#7b1fa2" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="No-Shows Today"
                icon={<WarningAmberIcon sx={{ color: 'white' }} />}
                value={stats?.today_noshows || 0}
                color="#f57c00"
                sub={`${stats?.tiket?.fraud || 0} total no-shows`}
              />
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
                <Bar dataKey="transactions" fill="#f5c518" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* No-Show Trend Chart */}
          <Paper sx={{ p: 3, mt: 3, border: '1px solid #f57c0044' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningAmberIcon sx={{ color: '#f57c00' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Daily No-Shows (Last 14 Days)</Typography>
            </Box>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={noShowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#141414', border: '1px solid #f57c00' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(v: any) => [v, 'No-Shows']}
                />
                <Bar dataKey="noshows" fill="#f57c00" radius={[4,4,0,0]} />
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
                  <TableRow key={m.id_film}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="img" src={m.poster_url || ''} sx={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 0.5 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.judul}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{m.genre}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{m.durasi}m</Typography></TableCell>
                    <TableCell><Typography variant="body2">{m.avg_rating}</Typography></TableCell>
                    <TableCell>
                      <Chip label={m.status} size="small"
                        color={m.status === 'now_showing' ? 'success' : m.status === 'coming_soon' ? 'warning' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => dispatch(deleteMovie(m.id_film))}>Delete</Button>
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
              <TextField label="Title" value={movieForm.judul} onChange={(e) => setMovieForm({ ...movieForm, judul: e.target.value })} required fullWidth />
              <TextField label="Genre" value={movieForm.genre} onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })} fullWidth />
              <TextField label="Duration (min)" type="number" value={movieForm.durasi} onChange={(e) => setMovieForm({ ...movieForm, durasi: Number(e.target.value) })} fullWidth />
              <TextField label="Poster URL" value={movieForm.poster_url} onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })} fullWidth />
              <TextField label="Description" value={movieForm.deskripsi} onChange={(e) => setMovieForm({ ...movieForm, deskripsi: e.target.value })} fullWidth multiline rows={3} />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={movieForm.status} label="Status" onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value as 'now_showing' | 'coming_soon' | 'ended' })}>
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
                  <TableRow key={sc.id_jadwal}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{sc.judul}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{sc.nama_bioskop} · {sc.nama_studio}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{new Date(sc.jam_tayang).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</Typography></TableCell>
                    <TableCell><Typography variant="body2">Rp{Number(sc.harga_tiket).toLocaleString()}</Typography></TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => dispatch(deleteSchedule(sc.id_jadwal))}>Delete</Button>
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
                <Select value={schedForm.id_film} label="Movie" onChange={(e) => setSchedForm({ ...schedForm, id_film: e.target.value })}>
                  {movies.map((m) => <MenuItem key={m.id_film} value={m.id_film}>{m.judul}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Hall</InputLabel>
                <Select value={schedForm.id_studio} label="Hall" onChange={(e) => setSchedForm({ ...schedForm, id_studio: e.target.value })}>
                  {halls.map((h: any) => <MenuItem key={h.id_studio} value={h.id_studio}>{h.nama_bioskop} - {h.nama_studio}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Start Time" type="datetime-local" value={schedForm.jam_tayang}
                onChange={(e) => setSchedForm({ ...schedForm, jam_tayang: e.target.value })}
                InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Price (Rp)" type="number" value={schedForm.harga_tiket}
                onChange={(e) => setSchedForm({ ...schedForm, harga_tiket: Number(e.target.value) })} fullWidth />
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
                <TableRow key={o.id_transaksi}>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{o.id_transaksi.slice(0, 8).toUpperCase()}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{o.nama}<br /><span style={{ color: '#888', fontSize: 12 }}>{o.email}</span></Typography></TableCell>
                  <TableCell><Typography variant="body2">-</Typography></TableCell>
                  <TableCell><Typography variant="body2">{new Date(o.tanggal_bayar).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>Rp{Number(o.total_bayar).toLocaleString()}</Typography></TableCell>
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
                <TableRow key={u.id_user}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.nama}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={u.role} size="small" color={u.role === 'Admin' ? 'primary' : u.role === 'Banned' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell>{u.total_transactions}</TableCell>
                  <TableCell>Rp{Number(u.total_spent).toLocaleString()}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small" variant="outlined"
                        onClick={() => dispatch(updateUserRole({ id: u.id_user, role: u.role === 'Admin' ? 'User' : 'Admin' }))}
                        disabled={u.role === 'Banned'}
                      >
                        {u.role === 'Admin' ? 'Demote' : 'Make Admin'}
                      </Button>
                      <Button
                        size="small" variant="contained" color={u.role === 'Banned' ? 'success' : 'error'}
                        onClick={() => dispatch(updateUserRole({ id: u.id_user, role: u.role === 'Banned' ? 'User' : 'Banned' }))}
                        disabled={u.role === 'Admin'}
                      >
                        {u.role === 'Banned' ? 'Unban' : 'Ban'}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CINEMAS */}
      {tab === 5 && (
        <Box>
           <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
            <Button variant="contained" color="secondary" onClick={() => setStudioDialog(true)}>+ Add Studio</Button>
            <Button variant="contained" onClick={() => setCinemaDialog(true)}>+ Add Cinema</Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  <TableCell>Cinema Name</TableCell>
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cinemas.map((c: any) => (
                  <TableRow key={c.id_bioskop}>
                    <TableCell>
                      {c.image_url ? (
                        <Box component="img" src={c.image_url} sx={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 1 }} />
                      ) : '-'}
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.nama_bioskop}</Typography></TableCell>
                    <TableCell>{c.lokasi}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add Cinema Dialog */}
          <Dialog open={cinemaDialog} onClose={() => setCinemaDialog(false)}>
            <DialogTitle>Add New Cinema</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important', minWidth: 400 }}>
              <TextField label="Cinema Name" required fullWidth
                value={cinemaForm.nama_bioskop} onChange={e => setCinemaForm({...cinemaForm, nama_bioskop: e.target.value})} />
              <TextField label="Location" required fullWidth multiline rows={2}
                value={cinemaForm.lokasi} onChange={e => setCinemaForm({...cinemaForm, lokasi: e.target.value})} />
              <TextField label="Image URL" fullWidth
                value={cinemaForm.image_url} onChange={e => setCinemaForm({...cinemaForm, image_url: e.target.value})} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCinemaDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateCinema}>Create Cinema</Button>
            </DialogActions>
          </Dialog>

          {/* Add Studio Dialog */}
          <Dialog open={studioDialog} onClose={() => setStudioDialog(false)}>
            <DialogTitle>Add Studio to Cinema</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important', minWidth: 400 }}>
              <FormControl fullWidth required>
                <InputLabel>Target Cinema</InputLabel>
                <Select value={studioForm.id_bioskop} label="Target Cinema" onChange={e => setStudioForm({...studioForm, id_bioskop: e.target.value})}>
                  {cinemas.map((c: any) => <MenuItem key={c.id_bioskop} value={c.id_bioskop}>{c.nama_bioskop}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Studio Name (e.g. Studio 1)" required fullWidth
                value={studioForm.nama_studio} onChange={e => setStudioForm({...studioForm, nama_studio: e.target.value})} />
              <TextField label="Capacity (Seats)" type="number" required fullWidth
                value={studioForm.kapasitas} onChange={e => setStudioForm({...studioForm, kapasitas: Number(e.target.value)})} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setStudioDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateStudio} disabled={!studioForm.id_bioskop}>Create Studio</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Container>
  )
}
