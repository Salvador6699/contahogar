import { Transaction, Account } from '@/types/finance';
import { formatCurrency } from './calculations';

export const exportTransactionsToCSV = (transactions: Transaction[], accounts: Account[]) => {
  // Define columns
  const headers = ['Fecha', 'Categoría', 'Cuenta', 'Importe', 'Tipo', 'Descripción', 'Estado'];
  
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Cta. Principal';

  // Format rows
  const rows = transactions.map(t => [
    t.date,
    t.category,
    getAccountName(t.accountId),
    t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 }),
    t.type === 'income' ? 'Ingreso' : 'Gasto',
    t.description || '',
    t.isPending ? 'Pendiente' : 'Confirmado'
  ]);

  // Create CSV content (handling commas and quotes)
  const csvContent = [
    headers.join(';'), // Use semicolon for better Excel compatibility in ES regions
    ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Create Blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().split('T')[0];
  
  link.setAttribute('href', url);
  link.setAttribute('download', `contahogar_transacciones_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
