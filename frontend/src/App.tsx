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
  Terms,
  Login,
  Register,
  GoogleOrgSetup,
  Dashboard,
  Entries,
  DataTable,
  KPIs,
  KPIDataView,
  AIBuilder,
  Insights,
  Rooms,
  RoomDashboard,
  Data,
  SettingsLayout,
  SettingsOrganization,
  SettingsAccount,
  SettingsPlanUsage,
  SettingsGeneral,
  SettingsActivityPage,
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
          <Route path="/signin" element={<Login />} />
          <Route path="/get-started" element={<Register />} />
          <Route path="/showcase" element={<Landing initialView="showcase" />} />
          <Route path="/google-setup" element={<GoogleOrgSetup />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

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
            <Route path="data-table" element={<DataTable />} />
            <Route path="insights" element={<Insights />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="ai-builder" element={<Navigate to="/dashboard" replace />} />
            <Route path="rooms/:roomId/ai-builder" element={<AIBuilder />} />
            <Route path="rooms/:roomId" element={<RoomDashboard />} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<SettingsOrganization />} />
              <Route path="organization" element={<Navigate to="/settings" replace />} />
              <Route path="account" element={<SettingsAccount />} />
              <Route path="plan" element={<SettingsPlanUsage />} />
              <Route path="general" element={<SettingsGeneral />} />

              {/* Dedicated Activity Page */}
              <Route path="activity" element={<SettingsActivityPage />} />

              {/* Organization section anchor redirects */}
              <Route path="overview" element={<Navigate to="/settings#overview" replace />} />
              <Route path="integrations" element={<Navigate to="/settings#integrations" replace />} />
              <Route path="users" element={<Navigate to="/settings#users" replace />} />
              <Route path="notifications" element={<Navigate to="/settings#notifications" replace />} />

              {/* Account section anchor redirects */}
              <Route path="profile" element={<Navigate to="/settings/account#profile" replace />} />
              <Route path="my-activity" element={<Navigate to="/settings/account#my-activity" replace />} />

              {/* Plan & Usage section anchor redirects */}
              <Route path="subscription" element={<Navigate to="/settings/plan#plan" replace />} />
              <Route path="usage" element={<Navigate to="/settings/plan#usage" replace />} />
              <Route path="upgrade" element={<Navigate to="/settings/plan#upgrade" replace />} />

              {/* General section anchor redirects */}
              <Route path="appearance" element={<Navigate to="/settings/general#appearance" replace />} />
              <Route path="security" element={<Navigate to="/settings/general#security" replace />} />
              <Route path="privacy" element={<Navigate to="/settings/general#privacy" replace />} />
              <Route path="terms" element={<Navigate to="/settings/general#terms" replace />} />

              <Route path="rooms" element={<Navigate to="/rooms" replace />} />
            </Route>
            <Route path="activity" element={<Navigate to="/settings/activity" replace />} />
            <Route path="users" element={<Navigate to="/settings#users" replace />} />
            <Route path="integrations" element={<Navigate to="/settings#integrations" replace />} />
            {/* Legacy admin links */}
            <Route path="admin" element={<Navigate to="/settings" replace />} />
            <Route path="admin/users" element={<Navigate to="/settings#users" replace />} />
            <Route path="admin/rooms" element={<Navigate to="/rooms" replace />} />
            <Route path="admin/organization" element={<Navigate to="/settings" replace />} />
            <Route path="admin/integrations" element={<Navigate to="/settings#integrations" replace />} />
            <Route path="admin/activity" element={<Navigate to="/settings/activity" replace />} />
            <Route path="subscription" element={<Navigate to="/settings/plan#upgrade" replace />} />
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
