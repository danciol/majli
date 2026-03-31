import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Service, Employee, Appointment } from '@/data/services';

// Generic hook for real-time Firestore collection
function useCollection<T extends { id: string }>(
  collectionName: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as T[];
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error(`Firestore error (${collectionName}):`, error);
      setLoading(false);
    });
    return unsubscribe;
  }, [collectionName]);

  return { data, loading };
}

// --- Services ---
export function useServices() {
  const { data, loading } = useCollection<Service>('services');
  
  const addService = async (service: Omit<Service, 'id'>) => {
    await addDoc(collection(db, 'services'), service);
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { id: _, ...data } = updates as Service;
    await updateDoc(doc(db, 'services', id), data);
  };

  const deleteService = async (id: string) => {
    await deleteDoc(doc(db, 'services', id));
  };

  return { services: data, loading, addService, updateService, deleteService };
}

// --- Employees ---
export function useEmployees() {
  const { data, loading } = useCollection<Employee>('employees');

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    await addDoc(collection(db, 'employees'), employee);
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const { id: _, ...data } = updates as Employee;
    await updateDoc(doc(db, 'employees', id), data);
  };

  const deleteEmployee = async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
  };

  return { employees: data, loading, addEmployee, updateEmployee, deleteEmployee };
}

// --- Appointments ---
export function useAppointments() {
  const { data, loading } = useCollection<Appointment>('appointments');

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    await addDoc(collection(db, 'appointments'), appointment);
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { id: _, ...data } = updates as Appointment;
    await updateDoc(doc(db, 'appointments', id), data);
  };

  const deleteAppointment = async (id: string) => {
    await deleteDoc(doc(db, 'appointments', id));
  };

  return { appointments: data, loading, addAppointment, updateAppointment, deleteAppointment };
}
