import {
  Card, CardMedia, CardContent, CardActions,
  Typography, Button, Chip, Box, Rating,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { Movie } from '../features/movies/moviesSlice'
import { useNavigate } from 'react-router-dom'

interface Props {
  movie: Movie
}

export default function MovieCard({ movie }: Props) {
  const navigate = useNavigate()

  const statusColor = movie.status === 'now_showing' ? 'success' : movie.status === 'coming_soon' ? 'warning' : 'default'
  const statusLabel = movie.status === 'now_showing' ? 'Now Showing' : movie.status === 'coming_soon' ? 'Coming Soon' : 'Ended'

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(229,9,20,0.3)' } }}>
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="360"
          image={movie.poster_url || 'https://via.placeholder.com/300x450?text=No+Poster'}
          alt={movie.judul}
          sx={{ objectFit: 'cover' }}
        />
        <Chip
          label={statusLabel}
          color={statusColor as any}
          size="small"
          sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 700 }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.5 }} noWrap>
          {movie.judul}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {movie.genre}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating value={Number(movie.avg_rating || 0) / 2} precision={0.5} size="small" readOnly />
          <Typography variant="caption" color="text.secondary">{Number(movie.avg_rating || 0)}/10</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">{movie.durasi} min</Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth variant="contained" size="small"
          onClick={() => navigate(`/movies/${movie.id_film}`)}
        >
          Details & Book
        </Button>
      </CardActions>
    </Card>
  )
}
