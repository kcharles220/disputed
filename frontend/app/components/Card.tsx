interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'purple';
  title?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  title,
}) => {
  const baseClasses = 'backdrop-blur-lg rounded-3xl p-10 shadow-2xl max-w-md w-full';
  
  const variantClasses = {
    default: 'bg-white/95 border-4 border-white/50',
    blue: 'bg-white/95 border-4 border-blue-300',
    green: 'bg-white/95 border-4 border-green-300',
    orange: 'bg-white/95 border-4 border-orange-300',
    purple: 'bg-white/95 border-4 border-purple-300',
  };

  const titleColors = {
    default: 'text-gray-800',
    blue: 'text-blue-800',
    green: 'text-green-800',
    orange: 'text-orange-800',
    purple: 'text-purple-800',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {title && (
        <h2 className={`text-3xl font-bold ${titleColors[variant]} mb-8 text-center`}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default Card;
