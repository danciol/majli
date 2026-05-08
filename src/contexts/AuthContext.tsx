import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Employee } from '@/data/services';

interface AuthContextType {
  employee: Employee | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  employee: null,
  isAuthenticated: false,
  loading: true,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'employees'), where('email', '==', user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            setEmployee({ ...docSnap.data(), id: docSnap.id } as Employee);
          } else {
            // Firebase Auth user exists but no matching employee — sign out
            await signOut(auth);
            setEmployee(null);
          }
        } catch {
          setEmployee(null);
        }
      } else {
        setEmployee(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, remember = false): Promise<boolean> => {
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    signOut(auth);
    setEmployee(null);
  };

  return (
    <AuthContext.Provider value={{ employee, isAuthenticated: !!employee, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
