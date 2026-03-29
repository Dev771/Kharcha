import * as Papa from 'papaparse';

export function renderCSV(
  group: any,
  expenses: any[],
  settlements: any[],
): string {
  const rows = expenses.map((exp: any) => ({
    Date: new Date(exp.date).toISOString().slice(0, 10),
    Description: exp.description,
    'Paid By': exp.paidBy?.name || 'Unknown',
    'Amount (Rs)': (exp.amountInPaise / 100).toFixed(2),
    Currency: exp.currency,
    Category: exp.category || '',
    'Split Type': exp.splitType,
  }));

  let csv = `Group: ${group.name}\nExported: ${new Date().toISOString().slice(0, 10)}\n\n`;
  csv += Papa.unparse(rows);

  if (settlements.length > 0) {
    csv += '\n\nSettlements\n';
    csv += Papa.unparse(
      settlements.map((s: any) => ({
        Date: new Date(s.createdAt).toISOString().slice(0, 10),
        From: s.paidBy?.name || 'Unknown',
        To: s.paidTo?.name || 'Unknown',
        'Amount (Rs)': (s.amountInPaise / 100).toFixed(2),
        Note: s.note || '',
      })),
    );
  }

  return csv;
}
