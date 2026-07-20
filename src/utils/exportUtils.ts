import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Task } from '../services/api';

/**
 * Escape string for CSV output
 */
const escapeCSV = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Export tasks as a CSV file download
 */
export const exportTasksToCSV = (projectName: string, tasks: Task[]) => {
  const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created Date'];

  const rows = tasks.map((t) => [
    escapeCSV(t.title),
    escapeCSV(t.status.replace('_', ' ')),
    escapeCSV(t.priority),
    escapeCSV(t.assignee?.name || 'Unassigned'),
    escapeCSV(t.due_date || 'None'),
    escapeCSV(t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizedProjectName}_tasks_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export tasks as a formatted PDF report download
 */
export const exportTasksToPDF = (projectName: string, workspaceName: string, tasks: Task[]) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();

  // Header / Title
  doc.setFontSize(16);
  doc.setTextColor(23, 23, 23); // #171717
  doc.text(`Project Task Report: ${projectName}`, 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115); // neutral-500
  doc.text(`Workspace: ${workspaceName}  |  Generated on: ${dateStr}`, 14, 27);

  // Summary Metrics
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const todo = tasks.filter((t) => t.status === 'TODO').length;
  const highPriority = tasks.filter((t) => t.priority === 'HIGH').length;

  doc.setFontSize(9);
  doc.setTextColor(23, 23, 23);
  doc.text(
    `Summary: ${total} Total Tasks  •  ${completed} Completed  •  ${inProgress} In Progress  •  ${todo} To Do  •  ${highPriority} High Priority`,
    14,
    34
  );

  // Table columns & rows
  const tableHeaders = [['#', 'Task Title', 'Status', 'Priority', 'Assignee', 'Due Date']];
  const tableData = tasks.map((t, idx) => [
    idx + 1,
    t.title,
    t.status.replace('_', ' '),
    t.priority,
    t.assignee?.name || 'Unassigned',
    t.due_date || '—',
  ]);

  autoTable(doc, {
    startY: 40,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [23, 23, 23],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [38, 38, 38],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 65 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 35 },
      5: { cellWidth: 25 },
    },
  });

  const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`${sanitizedProjectName}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
