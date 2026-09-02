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
  Subscription,
  RoomDashboard,
  Data,
  SettingsLayout,
  AdminDashboard,
  AdminRooms,
  AdminIntegrations,
  AdminApps,
  AdminActivity,
  AdminUsers,
  AdminOrganization,
  SettingsProfile,
  SettingsNotifications,
  SettingsAppearance,
  SettingsSecurity,
  SuperAdminLogin,
  SuperAdminLayout,
  SuperAdminInsights,
  SuperAdminOrgs,
  SuperAdminOrgDetail,
  SuperAdminUsers,
  SuperAdminSubscriptions,
  SuperAdminAdmins,
  SuperAdminCampaigns,
  SuperAdminAuditLog,
  SuperAdminIndustries,
  SuperAdminHealth,
  SuperAdminLeads,
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

          {/* Super-admin (platform-level) — separate tree, own auth */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminInsights />} />
            <Route path="organizations" element={<SuperAdminOrgs />} />
            <Route path="organizations/:orgId" element={<SuperAdminOrgDetail />} />
            <Route path="users" element={<SuperAdminUsers />} />
            <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
            <Route path="industries" element={<SuperAdminIndustries />} />
            <Route path="campaigns" element={<SuperAdminCampaigns />} />
            <Route path="audit-log" element={<SuperAdminAuditLog />} />
            <Route path="health" element={<SuperAdminHealth />} />
            <Route path="leads" element={<SuperAdminLeads />} />
            <Route path="admins" element={<SuperAdminAdmins />} />
          </Route>

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
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="integrations" element={<AdminIntegrations />} />
              <Route path="apps" element={<AdminApps />} />
              <Route path="activity" element={<AdminActivity />} />
              <Route path="profile" element={<SettingsProfile />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="organization" element={<AdminOrganization />} />
              <Route path="notifications" element={<SettingsNotifications />} />
              <Route path="appearance" element={<SettingsAppearance />} />
              <Route path="security" element={<SettingsSecurity />} />
            </Route>
            <Route path="users" element={<Navigate to="/settings/users" replace />} />
            <Route path="integrations" element={<Navigate to="/settings/integrations" replace />} />
            {/* Legacy admin links */}
            <Route path="admin" element={<Navigate to="/settings" replace />} />
            <Route path="admin/users" element={<Navigate to="/settings/users" replace />} />
            <Route path="admin/rooms" element={<Navigate to="/settings/rooms" replace />} />
            <Route path="admin/organization" element={<Navigate to="/settings/organization" replace />} />
            <Route path="admin/integrations" element={<Navigate to="/settings/integrations" replace />} />
            <Route path="admin/apps" element={<Navigate to="/settings/apps" replace />} />
            <Route path="admin/activity" element={<Navigate to="/settings/activity" replace />} />
            <Route path="subscription" element={<Subscription />} />
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
