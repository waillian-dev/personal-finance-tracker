export const formatCurrency = (val: number, currencyCode: string = 'USD'): string => {
  try {
    if (currencyCode === 'MMK') {
      // Round to nearest integer for MMK as cents/pyas are not used
      const rounded = Math.round(val);
      return `${rounded.toLocaleString('en-US')} Ks`;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(val);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${val} ${currencyCode}`;
  }
};
