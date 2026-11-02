// Guardado de progreso.
// Hoy se guarda en el navegador (localStorage). Más adelante se puede
// reemplazar `store` por uno que use Netlify Blobs sin tocar el resto del juego.

const KEY = 'terra-regalos-pan:save:v1';

export const LocalStore = {
  async load() {
    try {
      const s = localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
  async save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
  async clear() {
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
  },
};

export const store = LocalStore;
