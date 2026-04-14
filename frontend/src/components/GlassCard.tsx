import { ReactNode, CSSProperties, MouseEventHandler } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export const GlassCard = ({ children, className = '', hover = false, style, onClick }: GlassCardProps) => (
  <div
    className={`${hover ? 'glass-card-hover' : 'glass-card'} ${className}`}
    style={style}
    onClick={onClick}
  >
    {children}
  </div>
);
