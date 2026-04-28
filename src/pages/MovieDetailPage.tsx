import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Button, Box, Grid,
  Chip, Rating, CircularProgress, Alert, Card, CardContent, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EventIcon from '@mui/icons-material/Event'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchMovieById } from '../features/movies/moviesSlice'
import { fetchSchedules } from '../features/schedules/schedulesSlice'
import { fetchRatingsByFilm, createRating, deleteRating } from '../features/ratings/ratingsSlice'

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { selected: movie, loading, error } = useAppSelector((s) => s.movies)
  const { items: schedules } = useAppSelector((s) => s.schedules)
  const { items: ratings } = useAppSelector((s) => s.ratings)
  const { user } = useAppSelector((s) => s.auth)

  const [ratingDialog, setRatingDialog] = useState(false)
  const [ratingValue, setRatingValue] = useState(5) // 5 stars = 10 in backend
  const [ratingComment, setRatingComment] = useState('')

  useEffect(() => {
    if (id) {
      dispatch(fetchMovieById(id))
      dispatch(fetchSchedules({ id_film: id }))
      dispatch(fetchRatingsByFilm(id))
    }
  }, [dispatch, id])

  const handleSubmitRating = async () => {
    if (!id) return
    // Multiply by 2 because MUI 5 stars = backend 10 points
    await dispatch(createRating({ id_film: id, nilai_rating: ratingValue * 2, komentar: ratingComment }))
    setRatingDialog(false)
    setRatingComment('')
    dispatch(fetchMovieById(id)) // Refresh movie to get new avg_rating
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>
  if (error) return <Container sx={{ pt: 6 }}><Alert severity="error">{error}</Alert></Container>
  if (!movie) return null

  const movieSchedules = schedules.filter((s) => s.id_film === movie.id_film)

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
              alt={movie.judul}
              sx={{ width: '100%', borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
            />
          </Grid>

          {/* Details */}
          <Grid item xs={12} md={9}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>{movie.judul}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={movie.genre} variant="outlined" size="small" />
              <Chip
                label={movie.status === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
                color={movie.status === 'now_showing' ? 'success' : 'warning'}
                size="small"
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Rating value={Number(movie.avg_rating || 0) / 2} precision={0.5} readOnly />
              <Typography color="text.secondary">{Number(movie.avg_rating || 0)}/10</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography variant="body2" color="text.secondary">{movie.durasi} min</Typography>
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
              {movie.deskripsi}
            </Typography>

            {/* Schedules */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Available Schedules</Typography>
            {movieSchedules.length === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 4 }}>No schedules available for this movie.</Typography>
            ) : (
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {movieSchedules.map((sc) => (
                  <Grid item xs={12} sm={6} key={sc.id_jadwal}>
                    <Card sx={{ p: 0 }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{sc.nama_bioskop}</Typography>
                        <Typography variant="body2" color="text.secondary">{sc.nama_studio}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2">
                          {new Date(sc.jam_tayang).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ends: {new Date(sc.jam_selesai).toLocaleString('id-ID', { timeStyle: 'short' })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={`Regular: Rp${Number(sc.harga_tiket).toLocaleString()}`} size="small" />
                        </Box>
                      </CardContent>
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Button
                          fullWidth variant="contained"
                          onClick={() => navigate(`/schedules/${sc.id_jadwal}/seats`)}
                        >
                          Select Seats
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* User Reviews */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>User Reviews</Typography>
              {user && (
                <Button variant="outlined" onClick={() => setRatingDialog(true)}>
                  Write a Review
                </Button>
              )}
            </Box>

            {ratings.length === 0 ? (
              <Typography color="text.secondary">No reviews yet. Be the first to review!</Typography>
            ) : (
              <Grid container spacing={2}>
                {ratings.map((r) => (
                  <Grid item xs={12} key={r.id_rating}>
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {r.User?.nama || 'Anonymous'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 1 }}>
                              <Rating value={r.nilai_rating / 2} precision={0.5} readOnly size="small" />
                              <Typography variant="caption" color="text.secondary">{r.nilai_rating}/10</Typography>
                            </Box>
                          </Box>
                          {user?.id_user === r.id_user && (
                            <IconButton size="small" color="error" onClick={async () => {
                              await dispatch(deleteRating(r.id_rating))
                              dispatch(fetchMovieById(movie.id_film)) // Refresh avg rating
                            }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                        {r.komentar && (
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                            "{r.komentar}"
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Review Dialog */}
      <Dialog open={ratingDialog} onClose={() => setRatingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Write a Review</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '20px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1">Rate this movie</Typography>
            <Rating
              value={ratingValue}
              onChange={(_, newValue) => setRatingValue(newValue || 0)}
              precision={0.5}
              size="large"
            />
            <Typography variant="caption" color="text.secondary">
              {ratingValue * 2}/10 Points
            </Typography>
          </Box>
          <TextField
            label="Your Review (Optional)"
            multiline
            rows={4}
            fullWidth
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitRating} disabled={ratingValue === 0}>
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
