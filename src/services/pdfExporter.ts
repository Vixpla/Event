import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { EventData, EventTable, FamilyGuest } from '../types';

export async function exportSeatingChartToPDF(
  event: EventData,
  mapContainerElement?: HTMLElement | null
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo #4f46e5
  const darkColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const textMuted: [number, number, number] = [100, 116, 139]; // Slate 500

  // 1. PAGE 1: TITLE & EVENT OVERVIEW
  // Top Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PLAN GENERAL DE DISTRIBUCIÓN DE MESAS', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })} | EventMaster Pro`, margin, 21);

  // Event Details Box
  let currentY = 36;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 34, 3, 3, 'FD');

  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(event.title, margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.text(`Fecha: ${event.date} | Hora: ${event.time} hrs`, margin + 6, currentY + 16);
  doc.text(`Ubicación: ${event.location || 'Salón Principal'}`, margin + 6, currentY + 22);

  // Summary Metrics
  const totalGuests = event.families.reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);
  const assignedGuests = event.families
    .filter(f => f.status === 'assigned' && f.assignedTableId)
    .reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);
  const pendingGuests = totalGuests - assignedGuests;
  const totalCapacity = event.tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((assignedGuests / totalCapacity) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(
    `Mesas: ${event.tables.length}   |   Capacidad: ${totalCapacity} sillas   |   Asignados: ${assignedGuests}/${totalGuests} pax (${occupancyRate}%)`,
    margin + 6,
    currentY + 29
  );

  currentY += 40;

  // 2. CAPTURE & RENDER THE VISUAL MAP
  if (mapContainerElement) {
    try {
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PLANO VISUAL DEL SALÓN DE EVENTOS', margin, currentY);
      currentY += 4;

      const canvas = await html2canvas(mapContainerElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const maxHeight = 160;
      const finalHeight = Math.min(imgHeight, maxHeight);
      const finalWidth = (canvas.width * finalHeight) / canvas.height;
      const offsetX = margin + (imgWidth - finalWidth) / 2;

      doc.addImage(imgData, 'PNG', offsetX, currentY, finalWidth, finalHeight);
      currentY += finalHeight + 10;
    } catch (err) {
      console.warn('Error capturing visual map canvas, proceeding with vector summary:', err);
    }
  }

  // 3. PAGE BREAK FOR DETAILED TABLES BREAKDOWN
  doc.addPage();
  currentY = 20;

  doc.setFillColor(...primaryColor);
  doc.rect(margin, currentY, pageWidth - margin * 2, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DISTRIBUCIÓN DETALLADA POR MESAS', margin + 4, currentY + 6.5);

  currentY += 15;

  // Build table breakdown data for AutoTable
  const tablesTableData: any[] = [];

  event.tables.forEach((tbl) => {
    const assignedFamilies = event.families.filter(f => f.assignedTableId === tbl.id);
    const seatedCount = assignedFamilies.reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);
    const emptySeats = Math.max(0, tbl.capacity - seatedCount);

    if (assignedFamilies.length === 0) {
      tablesTableData.push([
        tbl.name,
        `${tbl.capacity} sillas`,
        'Mesa Vacía',
        '0',
        `${emptySeats} libres`,
        '---'
      ]);
    } else {
      assignedFamilies.forEach((fam, idx) => {
        tablesTableData.push([
          idx === 0 ? `${tbl.name} (${tbl.shape === 'round' ? 'Redonda' : 'Rectangular'})` : '',
          idx === 0 ? `Cap: ${tbl.capacity} (Ocup: ${seatedCount})` : '',
          `Familia ${fam.firstLastName} ${fam.secondLastName}${fam.contactName && fam.contactName !== `${fam.firstLastName} ${fam.secondLastName}` ? ` (${fam.contactName})` : ''}`,
          `${fam.memberCount} pers.`,
          idx === 0 ? `${emptySeats} disponibles` : '',
          fam.notes || 'Sin observaciones'
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Mesa / Ubicación', 'Capacidad', 'Familia Asignada', 'Integrantes', 'Sillas Libres', 'Notas / Dietas']],
    body: tablesTableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: darkColor,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: margin, right: margin },
  });

  // 4. DIRECTORY OF GUESTS (HOSTESS / RECEPCIÓN ALPHABETICAL LIST)
  doc.addPage();
  currentY = 20;

  doc.setFillColor(...primaryColor);
  doc.rect(margin, currentY, pageWidth - margin * 2, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DIRECTORIO ALFABÉTICO DE INVITADOS (RECEPCIÓN & CHECK-IN)', margin + 4, currentY + 6.5);

  currentY += 15;

  const sortedFamilies = [...event.families].sort((a, b) => {
    const nameA = `${a.firstLastName} ${a.secondLastName}`.toLowerCase();
    const nameB = `${b.firstLastName} ${b.secondLastName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const directoryData = sortedFamilies.map(fam => {
    const table = event.tables.find(t => t.id === fam.assignedTableId);
    return [
      `${fam.firstLastName} ${fam.secondLastName}`,
      fam.contactName || '-',
      `${fam.memberCount} personas`,
      table ? table.name : 'PENDIENTE DE ASIGNACIÓN',
      fam.phone || fam.email || '-',
      fam.notes || '-'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Apellidos de la Familia', 'Titular / Contacto', 'Pax', 'Mesa Asignada', 'Contacto', 'Observaciones']],
    body: directoryData.length > 0 ? directoryData : [['No hay familias registradas', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkColor,
      cellPadding: 2,
    },
    columnStyles: {
      3: { fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(
      `Página ${i} de ${totalPages}  |  ${event.title}  |  EventMaster Pro`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save the PDF
  const sanitizedFilename = `Plano_Mesas_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(sanitizedFilename);
}
