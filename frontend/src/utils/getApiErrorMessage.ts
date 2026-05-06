export const getApiErrorMessage = (error: any, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string') return error.message;

  const errors = error.errors;
  if (errors && typeof errors === 'object') {
    const firstKey = Object.keys(errors)[0];
    const firstValue = firstKey ? errors[firstKey] : null;
    if (Array.isArray(firstValue) && firstValue.length) return String(firstValue[0]);
    if (typeof firstValue === 'string') return firstValue;
  }

  return fallback;
};
