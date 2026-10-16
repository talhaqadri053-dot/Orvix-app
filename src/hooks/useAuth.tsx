import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  fetchCurrentUser,
  getEmailVerificationStatus,
  googleLogin as googleLoginRequest,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
} from '../api/auth';
import { setUnauthorizedHandler, tokenStorage } from '../api/client';
import { updatePassword as updatePasswordRequest, updateProfile as updateProfileRequest } from '../api/userService';

export interface User {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp_phone?: string;
  address?: string;
  country?: string;
  designation?: string;
  about_me?: string;
  avatar_url?: string;
  total_listings?: number;
  created_at?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  login: (email: string, password: string) => Promise<any>;
  googleLogin: (code: string, apiBaseUrl: string) => Promise<any>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    phone?: string
  ) => Promise<any>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (payload: any) => Promise<any>;
  emailVerificationStatus: () => Promise<any>;
  resendVerification: () => Promise<any>;
  updateProfile: (profileData: any) => Promise<any>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ) => Promise<any>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const isAuthenticated = Boolean(user);

  // A Google sign-in code can be exchanged only once. Keep the in-flight/finished
  // promise per code so duplicate calls reuse it instead of hitting the server again.
  const googleExchanges = useRef<Map<string, Promise<User>>>(new Map());

  const clearSession = useCallback(async () => {
    await tokenStorage.remove();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        throw new Error('Current user was not returned.');
      }
      setUser(currentUser);
      return currentUser;
    } catch {
      await clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // On app start, check if a token already exists and fetch the current user
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStorage.get();
        if (token) {
          await refreshUser();
        }
      } catch (err) {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedUser, token } = await loginRequest(email, password);
    if (!token) {
      throw new Error('Login response did not include an authentication token.');
    }

    await tokenStorage.set(token);
    if (!loggedUser) {
      await tokenStorage.remove();
      throw new Error('Login response did not include a user.');
    }
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const googleLogin = useCallback((code: string, apiBaseUrl: string): Promise<User> => {
    const existing = googleExchanges.current.get(code);
    if (existing) return existing;

    const request = (async () => {
      const { user: loggedUser, token } = await googleLoginRequest(code, apiBaseUrl);
      if (!token || !loggedUser) {
        throw new Error('Google sign-in response did not include an authenticated user.');
      }
      await tokenStorage.set(token);
      setUser(loggedUser);
      return loggedUser as User;
    })();

    googleExchanges.current.set(code, request);
    // If it failed, the code is spent anyway; keep the rejected promise so a
    // duplicate call shows the same error instead of a second 401.
    return request;
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    phone = ''
  ) => {
    const { user: registeredUser, token, verificationEmailSent } = await registerRequest({
      name,
      email,
      password,
      passwordConfirmation,
      phone,
    });
    if (token) {
      await tokenStorage.set(token);
    } else {
      await tokenStorage.remove();
    }
    if (!registeredUser) {
      await tokenStorage.remove();
      throw new Error('Registration response did not include a user.');
    }
    if (token) {
      setUser(registeredUser);
    }
    return { user: registeredUser, verificationEmailSent };
  }, []);

  const updateProfile = useCallback(async (profileData: any) => {
    const updatedUser = await updateProfileRequest(profileData);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ) => {
    const data = await updatePasswordRequest({
      currentPassword,
      password: newPassword,
      passwordConfirmation: newPasswordConfirmation,
    });
    return data;
  }, []);

  const logout = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const token = await tokenStorage.get();

      if (token) {
        await logoutRequest();
      }
    } catch {
      // Local sign-out must still complete when the API is unavailable.
    } finally {
      await clearSession();
      setIsSigningOut(false);
    }
  }, [clearSession]);

  const forgotPassword = useCallback((email: string) => requestPasswordReset(email), []);
  const resetPasswordRequest = useCallback((payload: any) => resetPassword(payload), []);
  const emailVerificationStatus = useCallback(() => getEmailVerificationStatus(), []);
  const resendVerification = useCallback(() => resendEmailVerification(), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isSigningOut,
        login,
        googleLogin,
        register,
        logout,
        forgotPassword,
        resetPassword: resetPasswordRequest,
        emailVerificationStatus,
        resendVerification,
        updateProfile,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}