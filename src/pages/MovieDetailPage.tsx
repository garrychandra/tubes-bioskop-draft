import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Button, Box, Grid,
  Chip, Rating, CircularProgress, Alert, Card, CardContent, Divider,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EventIcon from '@mui/icons-material/Event'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchMovieById } from '../features/movies/moviesSlice'
import { fetchSchedules } from '../features/schedules/schedulesSlice'

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { selected: movie, loading, error } = useAppSelector((s) => s.movies)
  const { items: schedules } = useAppSelector((s) => s.schedules)

  useEffect(() => {
    if (id) {
      dispatch(fetchMovieById(id))
      dispatch(fetchSchedules({ movie_id: id }))
    }
  }, [dispatch, id])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>
  if (error) return <Container sx={{ pt: 6 }}><Alert severity="error">{error}</Alert></Container>
  if (!movie) return null

  const movieSchedules = schedules.filter((s) => s.movie_id === movie.id)

  return (
    <Box>
      {/* Backdrop */}
      <Box sx={{
        height: 400, position: 'relative',
        backgroundImage: `url(${movie.backdrop_url || movie.poster_url})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), #0a0a0a)' }} />
      </Box>

      <Container maxWidth="lg" sx={{ mt: -10, position: 'relative', zIndex: 1, pb: 8 }}>
        <Grid container spacing={4}>
          {/* Poster */}
          <Grid item xs={12} md={3}>
            <Box
              component="img"
              src={movie.poster_url || 'https://via.placeholder.com/300x450'}
              alt={movie.title}
              sx={{ width: '100%', borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
            />
          </Grid>

          {/* Details */}
          <Grid item xs={12} md={9}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>{movie.title}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={movie.genre} variant="outlined" size="small" />
              <Chip label={movie.language} variant="outlined" size="small" />
              <Chip
                label={movie.status === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
                color={movie.status === 'now_showing' ? 'success' : 'warning'}
                size="small"
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Rating value={movie.rating / 2} precision={0.5} readOnly />
              <Typography color="text.secondary">{movie.rating}/10</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography variant="body2" color="text.secondary">{movie.duration_min} min</Typography>
              </Box>
              {movie.release_date && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EventIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(movie.release_date).toLocaleDateString('id-ID')}
                  </Typography>
                </Box>
              )}
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
              {movie.description}
            </Typography>

            {/* Schedules */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Available Schedules</Typography>
            {movieSchedules.length === 0 ? (
              <Typography color="text.secondary">No schedules available for this movie.</Typography>
            ) : (
              <Grid container spacing={2}>
                {movieSchedules.map((sc) => (
                  <Grid item xs={12} sm={6} key={sc.id}>
                    <Card sx={{ p: 0 }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{sc.cinema_name}</Typography>
                        <Typography variant="body2" color="text.secondary">{sc.hall_name}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2">
                          {new Date(sc.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ends: {new Date(sc.end_time).toLocaleString('id-ID', { timeStyle: 'short' })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={`Regular: Rp${Number(sc.price_regular).toLocaleString()}`} size="small" />
                          <Chip label={`VIP: Rp${Number(sc.price_vip).toLocaleString()}`} size="small" color="secondary" />
                        </Box>
                      </CardContent>
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Button
                          fullWidth variant="contained"
                          onClick={() => navigate(`/schedules/${sc.id}/seats`)}
                        >
                          Select Seats
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
