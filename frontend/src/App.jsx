import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import SignDocument from './pages/signature/SignatureEditor';
import PublicSign from './pages/public/PublicSign';
import DocumentDetails from './pages/dashboard/DocumentDetails';
import NotFound from './pages/system/NotFound';
import Unauthorized from './pages/system/Unauthorized';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route
          path="/sign/:id"
          element={
            <PrivateRoute>
              <SignDocument />
            </PrivateRoute>
          }
        />
        <Route
          path="/docs/:id"
          element={
            <PrivateRoute>
              <DocumentDetails />
            </PrivateRoute>
          }
        />
        <Route path="/share/:token" element={<PublicSign />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
