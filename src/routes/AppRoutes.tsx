import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import MoviesPage from '../pages/MoviesPage'
import MovieDetailPage from '../pages/MovieDetailPage'
import SchedulePage from '../pages/SchedulePage'
import CinemaPage from '../pages/CinemaPage'
import SeatSelectionPage from '../pages/SeatSelectionPage'
import CheckoutSuccessPage from '../pages/CheckoutSuccessPage'
import TicketsPage from '../pages/TicketsPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import AdminDashboard from '../pages/admin/AdminDashboard'
import VerifyPage from '../pages/VerifyPage'
import ProfilePage from '../pages/ProfilePage'
import ProtectedRoute from '../components/ProtectedRoute'

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/movies" element={<MoviesPage />} />
    <Route path="/movies/:id" element={<MovieDetailPage />} />
    <Route path="/schedule" element={<SchedulePage />} />
    <Route path="/cinema" element={<CinemaPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/verify" element={<VerifyPage />} />
    <Route path="/schedules/:id/seats" element={<ProtectedRoute><SeatSelectionPage /></ProtectedRoute>} />
    <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default AppRoutes
