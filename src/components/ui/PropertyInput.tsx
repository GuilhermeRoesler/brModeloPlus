type PropertyInputProps = {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
};

export const PropertyInput = ({
  label,
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder = '',
  disabled = false,
}: PropertyInputProps) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
      {label}
    </label>
    {type === 'select' ? (
      <div className="relative">
        <select
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ) : (
      <input
        type={type}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700 placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
      />
    )}
  </div>
);
