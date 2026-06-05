import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/admin/AdminRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BTOListPage } from './pages/admin/BTOListPage';
import { BTOEditPage } from './pages/admin/BTOEditPage';
import { BTODetailPage } from './pages/admin/BTODetailPage';
import { FlatModelEditPage } from './pages/admin/FlatModelEditPage';
import { FlatModelAnnotatePage } from './pages/admin/FlatModelAnnotatePage';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient();

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">Floorplan AI</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Design your dream HDB flat</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="bto" element={<BTOListPage />} />
              <Route path="bto/new" element={<BTOEditPage />} />
              <Route path="bto/:id" element={<BTODetailPage />} />
              <Route path="bto/:id/edit" element={<BTOEditPage />} />
              <Route path="bto/:btoId/flat-types/new" element={<FlatModelEditPage />} />
            </Route>
            {/* Annotation page — full screen, no sidebar */}
            <Route
              path="/admin/variants/:id/annotate"
              element={
                <AdminRoute>
                  <FlatModelAnnotatePage />
                </AdminRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
