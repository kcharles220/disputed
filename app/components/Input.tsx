interface InputProps {
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  label?: string;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  label,
  required = false,
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-purple-700 font-bold mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full p-4 rounded-2xl border-3 border-purple-300 
          focus:border-purple-500 focus:outline-none text-lg
          transition-all duration-200 hover:border-purple-400
          ${className}
        `}
      />
    </div>
  );
};

export default Input;
