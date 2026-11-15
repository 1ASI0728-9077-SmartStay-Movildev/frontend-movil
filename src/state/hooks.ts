import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../components/ui';

// Carga datos al montar la pantalla y expone recarga, estado y error.
export function useLoad<T>(fn: () => Promise<T>) {
  const ref = useRef(fn);
  ref.current = fn;
  const alive = useRef(true);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await ref.current();
      if (alive.current) setData(d);
    } catch (e) {
      if (alive.current) setError(errMsg(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { data, loading, error, reload, setError };
}

// Ejecuta una acción (guardar, eliminar...) con estado de espera y error.
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (key: string, fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errMsg(e));
      return false;
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, error, run, setError };
}
