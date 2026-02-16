import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { RoomProvider } from './context/RoomContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { Layout, ProtectedRoute, ErrorBoundary } from './components'
import {
  Landing,
  Privacy,
  Login,
  Register,
  GoogleOrgSetup,
  Dashboard,
  Entries,
  KPIs,
  KPIDataView,
  AIBuilder,
  Insights,
  Settings,
  RoomDashboard,
  Data,
  AdminLayout,
  AdminDashboard,
  AdminUsers,
  AdminRooms,
  AdminOrganization,
  AdminIntegrations,
  AdminActivity,
} from './pages'

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ThemeProvider>
      <AuthProvider>
        <RoomProvider>
          <ToastProvider>
            <Router>
            <Routes>
          {/* Public routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/google-setup" element={<GoogleOrgSetup />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="kpis" element={<KPIs />} />
            <Route path="kpis/:kpiId/data" element={<KPIDataView />} />
            <Route path="data" element={<Data />} />
            <Route path="entries" element={<Entries />} />
            <Route path="insights" element={<Insights />} />
            <Route path="ai-builder" element={<Navigate to="/dashboard" replace />} />
            <Route path="rooms/:roomId/ai-builder" element={<AIBuilder />} />
            <Route path="rooms/:roomId" element={<RoomDashboard />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="organization" element={<AdminOrganization />} />
              <Route path="integrations" element={<AdminIntegrations />} />
              <Route path="activity" element={<AdminActivity />} />
            </Route>
            <Route path="users" element={<Navigate to="/admin/users" replace />} />
            <Route path="integrations" element={<Navigate to="/settings?tab=integrations" replace />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
            </Router>
          </ToastProvider>
        </RoomProvider>
      </AuthProvider>
      </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}

export default App
