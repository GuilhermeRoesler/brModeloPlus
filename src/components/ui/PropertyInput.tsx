import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PropertyInputProps = {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
};

/** Valor sentinela: Radix Select não aceita string vazia. */
const SELECT_NONE = '__none__';

export const PropertyInput = ({
  label,
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder = '',
  disabled = false,
}: PropertyInputProps) => {
  const fieldId = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="mb-4 space-y-1.5">
      <label
        htmlFor={type === 'text' ? fieldId : undefined}
        className="block text-xs font-medium text-muted-foreground uppercase tracking-wider ml-0.5"
      >
        {label}
      </label>

      {type === 'select' ? (
        <Select
          value={value === undefined || value === '' ? SELECT_NONE : value}
          onValueChange={(next) => onChange(next === SELECT_NONE ? '' : next)}
          disabled={disabled}
        >
          <SelectTrigger
            size="default"
            className={cn(
              'w-full h-11 rounded-xl bg-muted/50 px-3 font-medium text-foreground shadow-xs',
              'hover:bg-muted/80 transition-[color,background-color,box-shadow,border-color]',
            )}
          >
            <SelectValue placeholder={placeholder || 'Selecionar…'} />
          </SelectTrigger>
          <SelectContent position="popper" align="start" className="z-[80] min-w-[var(--radix-select-trigger-width)]">
            {options.map((opt) => {
              const itemValue = opt.value === '' ? SELECT_NONE : opt.value;
              return (
                <SelectItem key={itemValue} value={itemValue} className="rounded-lg">
                  {opt.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={fieldId}
          type="text"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-xl bg-muted/50 px-3 font-medium shadow-xs"
        />
      )}
    </div>
  );
};
