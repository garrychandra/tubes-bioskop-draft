import { useEffect, useState, useMemo } from 'react'
import {
  Container, Typography, Grid, Box, Card, CardContent,
  Chip, Button, CircularProgress, Divider, ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchSchedules } from '../features/schedules/schedulesSlice'

function getDateStr(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
  const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  if (diff === 0) return `Today · ${label}`
  if (diff === 1) return `Tomorrow · ${label}`
  return `${dayName} · ${label}`
}

export default function SchedulePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cinemaId = searchParams.get('cinema_id') || undefined
  const { items: schedules, loading } = useAppSelector((s) => s.schedules)

  const dateOptions = useMemo(() => [getDateStr(0), getDateStr(1), getDateStr(2)], [])
  const [date, setDate] = useState(dateOptions[0])

  useEffect(() => {
    dispatch(fetchSchedules({ date, cinema_id: cinemaId }))
  }, [dispatch, date, cinemaId])

  // Group by cinema
  const byCinema = schedules.reduce((acc: any, sc) => {
    const key = sc.cinema_name
    if (!acc[key]) acc[key] = []
    acc[key].push(sc)
    return acc
  }, {})

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h3" sx={{ mb: 4, fontWeight: 800 }}>Movie Schedules</Typography>

      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={date}
          exclusive
          onChange={(_, v) => { if (v) setDate(v) }}
          size="small"
        >
          {dateOptions.map((d) => (
            <ToggleButton key={d} value={d} sx={{ textTransform: 'none', px: 2.5 }}>
              {formatDateLabel(d)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : Object.keys(byCinema).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography color="text.secondary">No schedules for this date</Typography>
        </Box>
      ) : (
        Object.entries(byCinema).map(([cinemaName, cinemaSchedules]: any) => (
          <Box key={cinemaName} sx={{ mb: 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{cinemaName}</Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              {cinemaSchedules.map((sc: any) => (
                <Grid item xs={12} sm={6} md={4} key={sc.id}>
                  <Card sx={{ display: 'flex', gap: 2, p: 2 }}>
                    <Box
                      component="img"
                      src={sc.poster_url}
                      alt={sc.movie_title}
                      sx={{ width: 70, height: 100, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                    />
                    <CardContent sx={{ p: 0, flexGrow: 1, '&:last-child': { pb: 0 } }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>{sc.movie_title}</Typography>
                      <Typography variant="caption" color="text.secondary">{sc.hall_name}</Typography>
                      <Box sx={{ my: 1 }}>
                        <Chip
                          label={new Date(sc.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          size="small" color="primary"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Regular: Rp{Number(sc.price_regular).toLocaleString()}
                      </Typography>
                      <Button
                        size="small" variant="outlined" fullWidth sx={{ mt: 1 }}
                        onClick={() => navigate(`/schedules/${sc.id}/seats`)}
                      >
                        Book
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
    </Container>
  )
}
