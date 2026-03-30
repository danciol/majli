import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockEmployees, Employee } from '@/data/services';

interface AuthContextType {
  employee: Employee | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  employee: null,
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
});

// Mock credentials — replace with Firebase Auth
const MOCK_CREDENTIALS: Record<string, { password: string; employeeId: string }> = {
  'anna@majlibeauty.pl': { password: 'admin123', employeeId: '1' },
  'marta@majlibeauty.pl': { password: 'admin123', employeeId: '2' },
  'karolina@majlibeauty.pl': { password: 'admin123', employeeId: '3' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('majli_employee_id');
    if (stored) {
      const emp = mockEmployees.find(e => e.id === stored);
      if (emp) setEmployee(emp);
    }
  }, []);

  const login = (email: string, password: string): boolean => {
    const cred = MOCK_CREDENTIALS[email.toLowerCase()];
    if (cred && cred.password === password) {
      const emp = mockEmployees.find(e => e.id === cred.employeeId);
      if (emp) {
        setEmployee(emp);
        localStorage.setItem('majli_employee_id', emp.id);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setEmployee(null);
    localStorage.removeItem('majli_employee_id');
    localStorage.removeItem('majli_admin');
  };

  return (
    <AuthContext.Provider value={{ employee, isAuthenticated: !!employee, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
