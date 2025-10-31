import PDFDocument from "pdfkit";

export function crearReportePDF(res, titulo, columnas, filas, nombreArchivo) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  res.setHeader("Content-Disposition", `attachment; filename=${nombreArchivo}.pdf`);
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  // Título
  doc.fontSize(16).text(titulo, { align: "center" });
  const fechaActual = new Date().toLocaleString("es-PE");
  doc.fontSize(10).text(`Generado el: ${fechaActual}`, { align: "right" });
  doc.moveDown(1);

  const startX = 40;
  let y = doc.y;

  // Encabezado
  let x = startX;
  doc.lineWidth(0.5);
  doc.fontSize(10).font("Helvetica-Bold");
  columnas.forEach(col => {
    doc.rect(x, y, col.width, 20).stroke();
    doc.text(col.header, x + 5, y + 5, { width: col.width - 10, align: "left" });
    x += col.width;
  });

  y += 20;

  // Filas
  doc.font("Helvetica");
  filas.forEach(row => {
    x = startX;
    const rowHeight = 20;
    columnas.forEach((col, i) => {
      const value = row[i] ?? "";
      doc.rect(x, y, col.width, rowHeight).stroke();
      doc.fontSize(9).text(value, x + 5, y + 6, { width: col.width - 10 });
      x += col.width;
    });
    y += rowHeight;
    if (y > 750) {
      doc.addPage();
      y = 60;
    }
  });

  doc.end();
}
