import { createContext, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // On page load, a saved token means "maybe logged in": ask the server who we are.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api("/me")
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(mode, fields) {
    const data = await api(`/auth/${mode}`, { method: "POST", body: fields });
    tokenStore.set(data.token);
    setUser(data.user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
