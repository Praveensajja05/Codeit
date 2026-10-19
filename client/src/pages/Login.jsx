import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const { user, authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (key) => (e) => setFields({ ...fields, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await authenticate(mode, fields);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="narrow">
      <h1>{mode === "login" ? "Log in" : "Create an account"}</h1>
      <form onSubmit={submit} className="form">
        {mode === "signup" && (
          <label>Name<input value={fields.name} onChange={set("name")} required autoComplete="name" /></label>
        )}
        <label>Email<input type="email" value={fields.email} onChange={set("email")} required autoComplete="email" /></label>
        <label>
          Password
          <input type="password" value={fields.password} onChange={set("password")} required minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <p className="muted">
        {mode === "login" ? "No account yet? " : "Already have an account? "}
        <button className="link-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
          {mode === "login" ? "Create one" : "Log in"}
        </button>
      </p>
    </section>
  );
}
