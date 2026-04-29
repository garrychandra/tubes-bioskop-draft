import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Container, Typography, Grid, Card, CardMedia,
  CardContent, CardActions, Button, Box, CircularProgress,
} from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import api from '../services/api'

interface Bioskop {
  id_bioskop: string
  nama_bioskop: string
  lokasi: string
  image_url: string
}

export default function CinemaPage() {
  const [cinemas, setCinemas] = useState<Bioskop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bioskop')
      .then((res) => setCinemas((res.data.bioskop || []) as Bioskop[]))
      .catch(() => setCinemas([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h3" sx={{ mb: 2, fontWeight: 800 }}>Our Cinemas</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
        Find the nearest cinema location and enjoy a world-class movie experience.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={4}>
          {cinemas.map((cinema) => (
            <Grid item xs={12} sm={6} md={4} key={cinema.id_bioskop}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column',
                '&:hover': { boxShadow: '0 8px 30px rgba(229,9,20,0.3)', transform: 'translateY(-4px)' },
                transition: 'all 0.2s' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={cinema.image_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600'}
                  alt={cinema.nama_bioskop}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{cinema.nama_bioskop}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <LocationOnIcon sx={{ color: 'primary.main', fontSize: 18, mt: 0.2 }} />
                    <Typography variant="body2" color="text.secondary">{cinema.lokasi}</Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    component={Link}
                    to={`/schedule?id_bioskop=${cinema.id_bioskop}`}
                  >
                    View Schedules
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
