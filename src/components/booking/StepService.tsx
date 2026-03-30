import { useState } from 'react';
import { Service, categories } from '@/data/services';
import { Clock, ChevronRight } from 'lucide-react';

interface Props {
  services: Service[];
  selected: Service | null;
  onSelect: (s: Service) => void;
}

export function StepService({ services, selected, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const filtered = services.filter(s => s.category === activeCategory);

  return (
    <div>
      <p className="text-muted-foreground text-sm mb-4">Wybierz usługę, którą chcesz zarezerwować</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>{cat.name}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
        {filtered.map(service => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
              selected?.id === service.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{service.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                  <Clock size={11} /> {service.duration} min
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm font-bold text-primary whitespace-nowrap">{service.price} zł</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Brak usług w tej kategorii</p>
        )}
      </div>
    </div>
  );
}
