import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Contests from "./pages/Contests.jsx";
import Problems from "./pages/Problems.jsx";
import Daily from "./pages/Daily.jsx";
import Favorites from "./pages/Favorites.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";

function RequireLogin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Contests />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/daily" element={<RequireLogin><Daily /></RequireLogin>} />
          <Route path="/favorites" element={<RequireLogin><Favorites /></RequireLogin>} />
          <Route path="/profile" element={<RequireLogin><Profile /></RequireLogin>} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
