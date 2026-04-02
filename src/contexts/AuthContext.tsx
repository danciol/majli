import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee } from '@/data/services';

interface AuthContextType {
  employee: Employee | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  employee: null,
  isAuthenticated: false,
  loading: true,
  login: async () => false,
  logout: () => {},
});

const STORAGE_KEY = 'majli_employee_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) {
      setLoading(false);
      return;
    }
    // Verify employee still exists
    const verify = async () => {
      try {
        const snap = await getDocs(collection(db, 'employees'));
        const found = snap.docs.find(d => d.id === storedId);
        if (found) {
          setEmployee({ ...found.data(), id: found.id } as Employee);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setLoading(false);
    };
    verify();
  }, []);

  const login = async (loginVal: string, passwordVal: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'employees'),
        where('login', '==', loginVal),
        where('password', '==', passwordVal)
      );
      const snap = await getDocs(q);
      if (snap.empty) return false;
      const doc = snap.docs[0];
      const emp = { ...doc.data(), id: doc.id } as Employee;
      setEmployee(emp);
      localStorage.setItem(STORAGE_KEY, emp.id);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setEmployee(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ employee, isAuthenticated: !!employee, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
