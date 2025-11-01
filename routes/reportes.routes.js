const express = require("express");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const connection = require("../config/db.js");
const fetch = require("node-fetch");

const router = express.Router();

/* =======================================================
   🔹 FUNCIÓN GENERAL PARA DIBUJAR TABLAS
======================================================= */
function drawTable(doc, headers, rows, startY = 150, rowHeight = 20, columnWidths = [], pageWidth = 595) {
  const startX = 40;
  let y = startY;
  let numero = 1;

  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(10);
    doc.rect(startX, y, pageWidth - 80, rowHeight).fill("#f0f0f0").stroke();
    doc.fillColor("black");
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x + 5, y + 5, { width: columnWidths[i] - 10, align: "left" });
      x += columnWidths[i];
    });
    y += rowHeight;
  };

  drawHeader();
  doc.font("Helvetica").fontSize(9);

  rows.forEach((row) => {
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage();
      y = 50;
      drawHeader();
    }
    let x = startX;
    const data = [numero++, ...row];
    data.forEach((cell, i) => {
      doc.rect(x, y, columnWidths[i], rowHeight).stroke();
      doc.text(cell ? String(cell) : "-", x + 5, y + 5, { width: columnWidths[i] - 10 });
      x += columnWidths[i];
    });
    y += rowHeight;
  });
}

/* =======================================================
   🔹 ENCABEZADO CON LOGO Y TÍTULOS
======================================================= */
async function addHeader(doc, title, filtro = {}) {
  const logoURL = "https://i.imgur.com/Y9TvSXs.png";

  try {
    const response = await fetch(logoURL);
    const arrayBuffer = await response.arrayBuffer();
    const logoBuffer = Buffer.from(arrayBuffer);
    doc.image(logoBuffer, 50, 30, { width: 80 });
  } catch (error) {
    console.error("⚠️ No se pudo cargar el logo remoto:", error.message);
  }

  doc.font("Helvetica-Bold").fontSize(18).text("NETLINK PERÚ", 0, 35, { align: "center" });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(14).text(title, { align: "center" });

  if (filtro.desde || filtro.hasta) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).text(`Rango: ${filtro.desde || "---"} hasta ${filtro.hasta || "---"}`, {
      align: "center",
    });
  }

  doc.moveDown(1.5);
}

/* =======================================================
   🔻 PIE DE PÁGINA
======================================================= */
function addFooter(doc) {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - 45;
    doc.strokeColor("#cccccc").moveTo(40, y).lineTo(doc.page.width - 40, y).stroke();
    doc.fontSize(8).fillColor("gray")
      .text(`Generado automáticamente por el sistema - Página ${i + 1} de ${pageCount}`,
        40, doc.page.height - 35, { align: "right", oblique: true });
  }
}

/* =======================================================
   ✅ 1) REPORTE: ASISTENCIAS
======================================================= */
router.get("/asistencias", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let query = `
      SELECT a.id, t.nombres, t.apellidos, a.fecha, a.hora_entrada, a.hora_salida, a.observaciones
      FROM asistencias a
      JOIN trabajadores t ON a.id_trabajador = t.id
    `;
    const params = [];
    if (desde && hasta) {
      query += " WHERE a.fecha BETWEEN ? AND ?";
      params.push(desde, hasta);
    }
    query += " ORDER BY a.fecha ASC";

    const [rows] = await connection.query(query, params);
    if (rows.length === 0) return res.status(404).json({ mensaje: "No hay asistencias registradas." });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_asistencias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "REPORTE DE ASISTENCIAS", { desde, hasta });
    const headers = ["Nº", "Nombres", "Apellidos", "Fecha", "Entrada", "Salida", "Observaciones"];
    const tableData = rows.map(r => [
      r.nombres, r.apellidos, r.fecha, r.hora_entrada || "-", r.hora_salida || "-", r.observaciones || "-"
    ]);
    const columnWidths = [30, 90, 90, 70, 60, 60, 100];

    drawTable(doc, headers, tableData, 140, 20, columnWidths);
    addFooter(doc);
    doc.end();
  } catch (error) {
    console.error("Error al generar reporte de asistencias:", error);
    res.status(500).json({ error: "Error al generar el reporte de asistencias" });
  }
});

/* =======================================================
   ✅ 2) REPORTE: TRABAJADORES
======================================================= */
router.get("/trabajadores", async (req, res) => {
  try {
    const [rows] = await connection.query(`SELECT nombres, apellidos, dni, cargo FROM trabajadores ORDER BY apellidos ASC`);
    if (rows.length === 0) return res.status(404).json({ message: "No hay trabajadores registrados" });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_trabajadores.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "LISTA DE TRABAJADORES");
    const headers = ["Nº", "Nombres", "Apellidos", "DNI", "Cargo"];
    const tableData = rows.map(t => [t.nombres, t.apellidos, t.dni, t.cargo || "-"]);
    const columnWidths = [30, 120, 120, 100, 150];

    drawTable(doc, headers, tableData, 140, 20, columnWidths);
    addFooter(doc);
    doc.end();
  } catch (error) {
    console.error("Error al generar reporte de trabajadores:", error);
    res.status(500).json({ error: "Error al generar el reporte de trabajadores" });
  }
});

/* =======================================================
   ✅ 3) REPORTE: MAQUINARIAS
======================================================= */
router.get("/maquinarias", async (req, res) => {
  try {
    const [rows] = await connection.query(`
      SELECT codigo, nombre, tipo, marca, modelo, placa, estado
      FROM maquinarias
      ORDER BY estado DESC, nombre ASC
    `);
    if (rows.length === 0) return res.status(404).json({ message: "No hay maquinarias registradas" });

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_maquinarias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "LISTA DE MAQUINARIAS");
    const headers = ["Nº", "Código", "Nombre", "Tipo", "Marca", "Modelo", "Placa", "Estado"];
    const tableData = rows.map(m => [m.codigo, m.nombre, m.tipo, m.marca, m.modelo, m.placa, m.estado]);
    const columnWidths = [30, 70, 150, 100, 100, 100, 100, 80];

    drawTable(doc, headers, tableData, 140, 20, columnWidths, 842);
    addFooter(doc);
    doc.end();
  } catch (error) {
    console.error("Error al generar reporte de maquinarias:", error);
    res.status(500).json({ error: "Error al generar el reporte de maquinarias" });
  }
});

/* =======================================================
   ✅ 4) REPORTE: REGISTRO DE MAQUINARIAS
======================================================= */
router.get("/maquinarias/registro", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let query = `
      SELECT rm.id, m.nombre AS maquinaria, CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
             rm.fecha, rm.hora_entrada, rm.hora_salida, rm.tipo_trabajo, rm.observaciones
      FROM registro_maquinaria rm
      JOIN maquinarias m ON rm.id_maquinaria = m.id
      JOIN trabajadores t ON rm.id_trabajador = t.id
    `;
    const params = [];
    if (desde && hasta) {
      query += " WHERE rm.fecha BETWEEN ? AND ?";
      params.push(desde, hasta);
    }
    query += " ORDER BY rm.fecha ASC";

    const [rows] = await connection.query(query, params);
    if (rows.length === 0) return res.status(404).json({ mensaje: "No hay registros de maquinarias." });

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_registro_maquinarias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "REGISTRO DE INGRESOS Y SALIDAS DE MAQUINARIAS", { desde, hasta });
    const headers = ["Nº", "Maquinaria", "Trabajador", "Fecha", "Entrada", "Salida", "Tipo trabajo", "Observaciones"];
    const tableData = rows.map(r => [
      r.maquinaria, r.trabajador, r.fecha, r.hora_entrada || "-", r.hora_salida || "-", r.tipo_trabajo || "-", r.observaciones || "-"
    ]);
    const columnWidths = [30, 110, 120, 70, 60, 60, 110, 130];

    drawTable(doc, headers, tableData, 140, 20, columnWidths, 842);
    addFooter(doc);
    doc.end();
  } catch (error) {
    console.error("Error al generar reporte de registro de maquinarias:", error);
    res.status(500).json({ error: "Error al generar el reporte de registro de maquinarias" });
  }
});

/* =======================================================
   ✅ 5) REPORTE: ESTADÍSTICAS
======================================================= */
router.get("/estadisticas", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const where = desde && hasta ? `WHERE a.fecha BETWEEN ? AND ?` : "";
    const params = desde && hasta ? [desde, hasta] : [];

    const [[dias]] = await connection.query(
      `SELECT COUNT(DISTINCT a.fecha) AS dias_trabajados FROM asistencias a ${where}`, params
    );

    const [materiales] = await connection.query(
      `SELECT COALESCE(rm.tipo_trabajo,'Sin especificar') AS tipo_trabajo,
              ROUND(SUM(COALESCE(rm.toneladas_movidas,0)),2) AS total_toneladas
       FROM registro_maquinaria rm
       ${where.replace("a.fecha","rm.fecha")}
       GROUP BY rm.tipo_trabajo
       ORDER BY total_toneladas DESC`, params
    );

    const doc = new PDFDocument({ margins: { top: 40, bottom: 20, left: 40, right: 40 }, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_estadisticas.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "RESUMEN ESTADÍSTICO DE OPERACIONES", { desde, hasta });
    doc.font("Helvetica-Bold").fontSize(12).text("Total de días trabajados:", 40, doc.y);
    doc.font("Helvetica-Bold").fontSize(18).text(String(dias.dias_trabajados || 0), 220, doc.y - 16);
    doc.moveDown(1.5);

    doc.font("Helvetica-Bold").fontSize(12).text("Totales por tipo de trabajo (toneladas)", 40, doc.y);
    doc.moveDown(0.5);

    const headers = ["Nº", "Tipo de trabajo", "Toneladas totales"];
    const tableData = materiales.map(m => [
      m.tipo_trabajo,
      (m.total_toneladas ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 }),
    ]);
    const columnWidths = [30, 300, 180];

    drawTable(doc, headers, tableData, 120, 20, columnWidths);
    addFooter(doc);
    doc.flushPages();
    doc.end();
  } catch (error) {
    console.error("Error al generar reporte de estadísticas:", error);
    res.status(500).json({ error: "Error al generar el reporte de estadísticas" });
  }
});

module.exports = router;
