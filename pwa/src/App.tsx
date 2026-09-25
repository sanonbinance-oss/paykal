import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import Payment from './pages/Payment'
import MyPayments from './pages/MyPayments'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route path="/inscription" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/discussions" replace />} />
          <Route path="/discussions" element={<Chat />} />
          <Route path="/paiement" element={<Payment />} />
          <Route path="/mes-paiements" element={<MyPayments />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
