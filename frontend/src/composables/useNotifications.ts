import { ref } from 'vue';

const state = ref({ open: false, message: '', color: 'success' });
export function useNotifications() {
  const notify = (message: string, color = 'success') => {
    state.value = { open: true, message, color };
  };
  return { state, notify };
}
