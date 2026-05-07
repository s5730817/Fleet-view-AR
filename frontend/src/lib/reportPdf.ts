import jsPDF from "jspdf";
import type { Bus } from "@/types/fleet";

export type ReportTarget = {
  title: string;
  buses: Bus[];
};

const loadImageAsBase64 = async (src: string): Promise<string | null> => {
  try {
    const response = await fetch(src);
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const downloadMaintenanceReportPdf = async (report: ReportTarget) => {
  const doc = new jsPDF();
  const logo = await loadImageAsBase64("/transitlens-logo.png");

  let y = 20;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const addFirstPageHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 32, "F");

    if (logo) {
      doc.addImage(logo, "PNG", 14, 7, 20, 20);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("TransitLens", logo ? 40 : 14, 15);

    doc.setFontSize(9);
    doc.text("AR Maintenance System", logo ? 40 : 14, 22);

    doc.setTextColor(0, 0, 0);
    y = 45;
  };

  const addPageIfNeeded = (spaceNeeded = 20) => {
    if (y + spaceNeeded > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
  };

  addFirstPageHeader();

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(report.title, 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${report.buses.length} ${report.buses.length === 1 ? "bus" : "buses"} included`,
    14,
    y
  );
  y += 10;

  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  report.buses.forEach((bus) => {
    addPageIfNeeded(45);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y, pageWidth - 28, 30, 3, 3, "F");

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${bus.name} · ${bus.plateNumber}`, 20, y + 9);

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`${bus.year} ${bus.model}`, 20, y + 16);
    doc.text(`Status: ${bus.status}`, 20, y + 23);
    doc.text(`Mileage: ${bus.mileage.toLocaleString()}`, 80, y + 23);
    doc.text(
      `Next Service: ${new Date(bus.nextServiceDate).toLocaleDateString()}`,
      135,
      y + 23
    );

    y += 40;

    bus.components.forEach((component) => {
      addPageIfNeeded(35);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(component.name, 14, y);

      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `Status: ${component.status} · Health: ${component.healthPercent}% · Last Service: ${new Date(
          component.lastService
        ).toLocaleDateString()}`,
        14,
        y + 5
      );

      y += 11;

      if (component.history.length === 0) {
        doc.setFontSize(9);
        doc.text("No maintenance history available.", 18, y);
        y += 8;
      } else {
        component.history.forEach((entry) => {
          const descriptionLines = doc.splitTextToSize(
            entry.description,
            pageWidth - 50
          );

          const noteLines = entry.notes
            ? doc.splitTextToSize(`Notes: ${entry.notes}`, pageWidth - 50)
            : [];

          const boxHeight =
            16 + descriptionLines.length * 5 + noteLines.length * 5;

          addPageIfNeeded(boxHeight + 6);

          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(230, 230, 230);
          doc.roundedRect(18, y, pageWidth - 36, boxHeight, 2, 2, "FD");

          doc.setFontSize(8);
          doc.setTextColor(90, 90, 90);
          doc.text(
            `${new Date(entry.date).toLocaleDateString()} · ${entry.type} · ${
              entry.technician
            }`,
            22,
            y + 5
          );

          doc.setFontSize(9);
          doc.setTextColor(20, 20, 20);
          doc.text(descriptionLines, 22, y + 11);

          if (entry.notes) {
            doc.setFontSize(8);
            doc.setTextColor(90, 90, 90);
            doc.text(noteLines, 22, y + 11 + descriptionLines.length * 5);
          }

          y += boxHeight + 4;
        });
      }

      y += 4;
    });

    y += 8;
  });

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);

    doc.text(
      `Generated ${new Date().toLocaleDateString()}`,
      14,
      pageHeight - 10
    );

    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 34, pageHeight - 10);
  }

  const fileName = report.title.toLowerCase().replace(/\s+/g, "-");
  doc.save(`${fileName}.pdf`);
};