export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-IN');
};

export const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PARTIALLY_DISPATCHED: 'bg-blue-100 text-blue-800 border-blue-300',
  FULLY_DISPATCHED: 'bg-green-100 text-green-800 border-green-300',
  IN_TRANSIT: 'bg-purple-100 text-purple-800 border-purple-300',
  DELAYED: 'bg-red-100 text-red-800 border-red-300',
  PENDING_DELAYED: 'bg-orange-100 text-orange-800 border-orange-300',
};

export const statusLabels = {
  PENDING: 'Pending',
  PARTIALLY_DISPATCHED: 'Partial',
  FULLY_DISPATCHED: 'Fully Dispatched',
  IN_TRANSIT: 'In Transit',
  DELAYED: 'Delayed',
  PENDING_DELAYED: 'Pending Delayed',
};
