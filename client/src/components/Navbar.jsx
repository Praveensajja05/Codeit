import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <NavLink to="/" className="brand">Codeit</NavLink>
      <nav>
        <NavLink to="/" end>Contests</NavLink>
        <NavLink to="/problems">Problems</NavLink>
        <NavLink to="/daily">Daily</NavLink>
        <NavLink to="/favorites">Favorites</NavLink>
      </nav>
      <div className="nav-user">
        {user ? (
          <>
            <NavLink to="/profile">{user.name}</NavLink>
            <button className="link-button" onClick={logout}>Log out</button>
          </>
        ) : (
          <NavLink to="/login">Log in</NavLink>
        )}
      </div>
    </header>
  );
}
