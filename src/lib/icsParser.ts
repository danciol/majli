import { Appointment } from '@/data/services';
import { v4Fallback } from './icsUtils';

function parseICSDate(value: string): Date | null {
  // Handles YYYYMMDDTHHMMSS and YYYYMMDDTHHMMSSZ
  const clean = value.replace(/[^0-9T]/g, '').replace('T', '');
  if (clean.length < 8) return null;
  const y = parseInt(clean.slice(0, 4));
  const m = parseInt(clean.slice(4, 6)) - 1;
  const d = parseInt(clean.slice(6, 8));
  const h = clean.length >= 10 ? parseInt(clean.slice(8, 10)) : 0;
  const min = clean.length >= 12 ? parseInt(clean.slice(10, 12)) : 0;
  const s = clean.length >= 14 ? parseInt(clean.slice(12, 14)) : 0;
  
  if (value.endsWith('Z')) {
    return new Date(Date.UTC(y, m, d, h, min, s));
  }
  return new Date(y, m, d, h, min, s);
}

function unfoldLines(text: string): string {
  // RFC 5545: lines starting with space/tab are continuations
  return text.replace(/\r?\n[ \t]/g, '');
}

export function parseICSFile(icsContent: string): Partial<Appointment>[] {
  const unfolded = unfoldLines(icsContent);
  const lines = unfolded.split(/\r?\n/);
  const events: Partial<Appointment>[] = [];
  
  let inEvent = false;
  let current: Record<string, string> = {};

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
    } else if (line === 'END:VEVENT' && inEvent) {
      inEvent = false;
      const dtStart = current['DTSTART'] || current['DTSTART;VALUE=DATE'];
      const dtEnd = current['DTEND'] || current['DTEND;VALUE=DATE'];
      
      if (dtStart) {
        const startDate = parseICSDate(dtStart);
        const endDate = dtEnd ? parseICSDate(dtEnd) : null;
        
        if (startDate) {
          const duration = endDate 
            ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
            : 60;

          events.push({
            id: v4Fallback(),
            clientName: current['SUMMARY'] || 'Wydarzenie z kalendarza',
            clientPhone: '',
            clientEmail: current['ORGANIZER']?.replace('mailto:', '') || '',
            date: startDate.toISOString(),
            duration: Math.max(duration, 15),
            status: 'confirmed',
            notes: [
              current['DESCRIPTION'],
              current['LOCATION'] ? `Lokalizacja: ${current['LOCATION']}` : '',
            ].filter(Boolean).join('\n') || undefined,
            googleCalendarEventId: current['UID'] || undefined,
            serviceId: '',
            employeeId: '',
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else if (inEvent) {
      // Handle properties with parameters like DTSTART;TZID=...:value
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx);
        const value = line.slice(colonIdx + 1);
        // Store both full key and base key (without params)
        const baseKey = key.split(';')[0];
        current[key] = value;
        if (key !== baseKey) current[baseKey] = value;
      }
    }
  }

  return events;
}
