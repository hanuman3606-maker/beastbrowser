import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function FirebaseTest() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div>Testing Firebase connection...</div>;
  }

  return (
    <div>
      <h2>Firebase Connection Test</h2>
      {user ? (
        <div>
          <p>Connected as: {user.email}</p>
          <p>User ID: {user.uid}</p>
        </div>
      ) : (
        <p>Firebase is configured but no user is signed in.</p>
      )}
    </div>
  );
}