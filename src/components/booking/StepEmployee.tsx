import { Employee } from '@/data/services';
import { ChevronLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  employees: Employee[];
  selected: Employee | null;
  onSelect: (e: Employee) => void;
  onBack: () => void;
}

export function StepEmployee({ employees, selected, onSelect, onBack }: Props) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft size={16} /> Zmień usługę
      </button>
      <p className="text-muted-foreground text-sm mb-4">Wybierz specjalistkę</p>

      <div className="space-y-2">
        {employees.map(emp => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp)}
            className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm flex items-center gap-4 ${
              selected?.id === emp.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
              {emp.photo ? (
                <img src={emp.photo} alt={emp.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">{emp.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {Object.keys(emp.workingHours).length} dni w tygodniu
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
