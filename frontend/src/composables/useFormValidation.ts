export function useFormValidation() {
  const required = (label: string) => (value: string) => (!!value ? true : `${label} is required`);
  const email = (value: string) => /.+@.+\..+/.test(value) || 'Invalid email';
  return { required, email };
}
