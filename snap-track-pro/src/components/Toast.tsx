'use client';
import { useEffect, useState } from 'react';

type T = { id: number; msg: string; kind: 'info' | 'error' | 'success' };

let push: ((t: Omit<T, 'id'>) => void) | null = null;

export function toast(msg: string, kind: T['kind'] = 'info') {
  push?.({ msg, kind });
}

export function ToastHost() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { id, ...t }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2500);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={
            'px-4 py-2 rounded-full text-white text-sm shadow-lg ' +
            (t.kind === 'error' ? 'bg-red-700' : t.kind === 'success' ? 'bg-green-700' : 'bg-ink')
          }
          style={{ background: t.kind === 'info' ? '#1f2233' : undefined }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
