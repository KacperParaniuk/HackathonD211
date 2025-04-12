// hooks/useAuth.tsx
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../app/firebase';  // Firebase auth import

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return unsubscribe;
  }, []);

  return { isAuthenticated };
};
