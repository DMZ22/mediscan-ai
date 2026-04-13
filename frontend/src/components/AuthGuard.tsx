import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  if (!localStorage.getItem('access_token')) {
    return null;
  }

  return <>{children}</>;
};
