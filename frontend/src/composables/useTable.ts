import { ref } from 'vue';

export function useTable() {
  const page = ref(1);
  const perPage = ref(10);
  const search = ref('');
  return { page, perPage, search };
}
