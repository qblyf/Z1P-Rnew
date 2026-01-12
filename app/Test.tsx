'use client';
import { useEffect, useState } from 'react';
import { waitFor } from '../error';

export default function Test() {
  const [testUUID, setIsTest] = useState<string>();

  useEffect(() => {
    const res = localStorage.getItem('testUUID');
    if (res === null || res.length === 0) {
      console.log('production mode');
      return;
    }
    console.log('debug mode');
    setIsTest(res);
  }, []);

  useEffect(() => {
    if (!testUUID) {
      return;
    }
    waitFor(() => {
      const h5RemoteDebugSdk = (window as any).h5RemoteDebugSdk;
      return typeof h5RemoteDebugSdk !== 'object';
    }).then(() => {
      const h5RemoteDebugSdk = (window as any).h5RemoteDebugSdk;
      h5RemoteDebugSdk.init({
        uuid: testUUID,
        observerElement: document.documentElement,
      });
      console.log('h5RemoteDebugSdk has init.');
    });
  }, [testUUID]);

  return <></>;
}
