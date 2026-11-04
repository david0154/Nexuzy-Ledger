import { createContext, useContext } from 'react';

export const AuthContext = createContext({
  user: null,
  logout: async () => {},
  openChangePassword: () => {},
});
export const useAuth = () => useContext(AuthContext);
