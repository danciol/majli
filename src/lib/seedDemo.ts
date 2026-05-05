import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addDays, subDays, addHours, startOfDay } from 'date-fns';

const SERVICES = [
  { id:'s1', name:'Manicure klasyczny',  price:80,  duration:45,  category:'manicure', employees:['e1','e2'], active:true, selfBooking:true },
  { id:'s2', name:'Manicure hybrydowy',  price:120, duration:60,  category:'manicure', employees:['e1','e2'], active:true, selfBooking:true },
  { id:'s3', name:'Manicure żelowy',     price:150, duration:90,  category:'manicure', employees:['e1'],      active:true, selfBooking:true },
  { id:'s4', name:'Pedicure klasyczny',  price:100, duration:60,  category:'pedicure', employees:['e2'],      active:true, selfBooking:true },
  { id:'s5', name:'Pedicure hybrydowy',  price:130, duration:75,  category:'pedicure', employees:['e2'],      active:true, selfBooking:true },
  { id:'s6', name:'Przedłużanie rzęs',   price:200, duration:120, category:'rzesy',    employees:['e3'],      active:true, selfBooking:true },
  { id:'s7', name:'Uzupełnienie rzęs',   price:130, duration:90,  category:'rzesy',    employees:['e3'],      active:true, selfBooking:true },
  { id:'s8', name:'Henna brwi',          price:60,  duration:30,  category:'brwi',     employees:['e1','e3'], active:true, selfBooking:true },
  { id:'s9', name:'Laminowanie brwi',    price:120, duration:60,  category:'brwi',     employees:['e3'],      active:true, selfBooking:true },
];

const EMPLOYEES = [
  { id:'e1', name:'Anna Kowalska',       role:'pracownik', email:'anna@demo.pl',     photo:'', services:['s1','s2','s3','s8'] },
  { id:'e2', name:'Karolina Wiśniewska', role:'pracownik', email:'karolina@demo.pl', photo:'', services:['s1','s2','s4','s5'] },
  { id:'e3', name:'Marta Nowak',         role:'pracownik', email:'marta@demo.pl',    photo:'', services:['s6','s7','s8','s9'] },
];

const CLIENTS = [
  { id:'c1', name:'Zofia Adamczyk',      phone:'+48 600 100 200', email:'zofia@demo.pl' },
  { id:'c2', name:'Natalia Krawczyk',    phone:'+48 601 200 300', email:'natalia@demo.pl' },
  { id:'c3', name:'Magdalena Piotrowska',phone:'+48 602 300 400', email:'magdalena@demo.pl' },
  { id:'c4', name:'Aleksandra Wójcik',   phone:'+48 603 400 500', email:'aleksandra@demo.pl' },
  { id:'c5', name:'Paulina Kowalczyk',   phone:'+48 604 500 600', email:'paulina@demo.pl' },
  { id:'c6', name:'Monika Zając',        phone:'+48 605 600 700', email:'monika@demo.pl' },
  { id:'c7', name:'Sylwia Lewandowska',  phone:'+48 606 700 800', email:'sylwia@demo.pl' },
  { id:'c8', name:'Justyna Kamińska',    phone:'+48 607 800 900', email:'justyna@demo.pl' },
];

export async function seedDemo() {
  const existing = await getDocs(collection(db, 'services'));
  if (existing.size > 0) return;

  const b1 = writeBatch(db);
  SERVICES.forEach(({ id, ...data }) => b1.set(doc(db, 'services', id), data));
  EMPLOYEES.forEach(({ id, ...data }) => b1.set(doc(db, 'employees', id), data));
  CLIENTS.forEach(({ id, ...data }) => b1.set(doc(db, 'clients', id), data));
  await b1.commit();

  const today = startOfDay(new Date());
  const appts = [
    { h:9,  si:1, ei:'e1', ci:0, status:'confirmed' },
    { h:11, si:5, ei:'e3', ci:1, status:'confirmed' },
    { h:13, si:3, ei:'e2', ci:2, status:'pending' },
    { h:15, si:0, ei:'e1', ci:3, status:'pending' },
  ];

  const b2 = writeBatch(db);
  appts.forEach(({ h, si, ei, ci, status }) => {
    b2.set(doc(collection(db, 'appointments')), {
      serviceId: SERVICES[si].id, employeeId: ei,
      clientName: CLIENTS[ci].name, clientPhone: CLIENTS[ci].phone, clientEmail: CLIENTS[ci].email,
      date: addHours(today, h).toISOString(),
      duration: SERVICES[si].duration, status,
      createdAt: subDays(today, 1).toISOString(),
    });
  });

  for (let d = 1; d <= 30; d++) {
    const day = subDays(today, d);
    if (day.getDay() === 0) continue;
    [0,1,2].forEach(i => {
      const si = (d + i) % SERVICES.length;
      const ci = (d + i) % CLIENTS.length;
      b2.set(doc(collection(db, 'appointments')), {
        serviceId: SERVICES[si].id, employeeId: EMPLOYEES[i % 3].id,
        clientName: CLIENTS[ci].name, clientPhone: CLIENTS[ci].phone, clientEmail: CLIENTS[ci].email,
        date: addHours(day, 9 + i * 2).toISOString(),
        duration: SERVICES[si].duration, status: 'completed',
        createdAt: subDays(day, 1).toISOString(),
      });
    });
  }
  await b2.commit();
  await setDoc(doc(db, 'settings', 'global'), { depositAmount: 50 }, { merge: true });
}
