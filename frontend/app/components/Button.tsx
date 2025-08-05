interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const baseClasses = 'font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl btn-legal';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105',
    secondary: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:scale-105',
    success: 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:scale-105',
    warning: 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:scale-105',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:scale-105',
  };

  const sizeClasses = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg',
    xl: 'py-4 px-8 text-xl',
  };

  const disabledClasses = disabled
    ? 'bg-gray-400 text-gray-600 cursor-not-allowed hover:scale-100'
    : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${disabled ? disabledClasses : variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default Button;
