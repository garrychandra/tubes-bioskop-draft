import { useEffect } from 'react'
import {
  Box, Typography, Button, Grid, Container,
  Chip, Paper, CircularProgress,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchMovies } from '../features/movies/moviesSlice'
import { fetchSchedules } from '../features/schedules/schedulesSlice'
import MovieCard from '../components/MovieCard'
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber'
import EventIcon from '@mui/icons-material/Event'
import SecurityIcon from '@mui/icons-material/Security'
import StarIcon from '@mui/icons-material/Star'

export default function HomePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { items: movies, loading } = useAppSelector((s) => s.movies)
  const { items: schedules } = useAppSelector((s) => s.schedules)

  useEffect(() => {
    dispatch(fetchMovies({ status: 'now_showing' }))
    dispatch(fetchSchedules(undefined))
  }, [dispatch])

  const nowShowing = movies.filter((m) => m.status === 'now_showing').slice(0, 4)

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          minHeight: '92vh', display: 'flex', alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 50%, #0a0a0a 100%)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1400)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.12,
        }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ maxWidth: 700 }}>
            <Chip label="Now Showing" color="primary" sx={{ mb: 2, fontWeight: 700 }} />
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4.5rem' }, mb: 2 }}>
              Your Ultimate
              <Box component="span" sx={{ color: 'primary.main' }}> Cinema </Box>
              Experience
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
              Book tickets instantly, choose your seats, and enjoy the magic of cinema.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="contained" size="large" onClick={() => navigate('/movies')}
                sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}>
                Browse Movies
              </Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/schedule')}
                sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}>
                View Schedules
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {[
              { icon: <ConfirmationNumberIcon sx={{ fontSize: 42, color: 'primary.main' }} />, title: 'Easy Booking', desc: 'Book tickets in seconds with our seamless checkout.' },
              { icon: <EventIcon sx={{ fontSize: 42, color: 'secondary.main' }} />, title: 'Live Schedules', desc: 'Real-time showtimes across all our partner cinemas.' },
              { icon: <StarIcon sx={{ fontSize: 42, color: 'primary.main' }} />, title: 'Seat Selection', desc: 'Pick your perfect seat with our interactive seat map.' },
              { icon: <SecurityIcon sx={{ fontSize: 42, color: 'secondary.main' }} />, title: 'QR Verification', desc: 'Instant ticket verification with unique QR codes.' },
            ].map((f, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Paper sx={{ p: 3, textAlign: 'center', height: '100%', bgcolor: 'background.default' }}>
                  {f.icon}
                  <Typography variant="h6" sx={{ mt: 1.5, mb: 1, fontWeight: 700 }}>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Now Showing */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h3">Now Showing</Typography>
          <Button variant="outlined" onClick={() => navigate('/movies')}>See All</Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Grid container spacing={3}>
            {nowShowing.map((movie) => (
              <Grid item xs={6} sm={4} md={3} key={movie.id_film}>
                <MovieCard movie={movie} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Upcoming Schedules */}
      {schedules.length > 0 && (
        <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
          <Container maxWidth="lg">
            <Typography variant="h3" sx={{ mb: 4 }}>Upcoming Schedules</Typography>
            <Grid container spacing={2}>
              {schedules.slice(0, 3).map((s) => (
                <Grid item xs={12} md={4} key={s.id_jadwal}>
                  <Paper
                    sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'center', cursor: 'pointer',
                      '&:hover': { bgcolor: 'background.default' } }}
                    onClick={() => navigate(`/schedules/${s.id_jadwal}/seats`)}
                  >
                    <Box component="img" src={s.poster_url || 'https://via.placeholder.com/60x90'} alt={s.judul || 'Movie Poster'}
                      sx={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 1 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.judul}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.nama_bioskop}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.nama_studio}</Typography>
                      <Chip
                        label={new Date(s.jam_tayang).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        size="small" sx={{ mt: 0.5 }} color="primary" variant="outlined"
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ bgcolor: '#050505', py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © 2026 CineMax — All rights reserved
        </Typography>
      </Box>
    </Box>
  )
}
