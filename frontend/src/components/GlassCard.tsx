import { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}

export const GlassCard = ({ children, className = '', hover = false, style }: GlassCardProps) => (
  <div className={`${hover ? 'glass-card-hover' : 'glass-card'} ${className}`} style={style}>
    {children}
  </div>
);
