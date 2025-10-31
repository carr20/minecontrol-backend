import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import connection from "../config/db.js";

const router = express.Router();

/* =======================================================
   🔹 FUNCIÓN GENERAL PARA DIBUJAR TABLAS TIPO EXCEL
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
   🔹 ENCABEZADO CON LOGO IZQUIERDO Y TÍTULOS CENTRADOS
======================================================= */
function addHeader(doc, title, filtro = {}) {
  const logoURL = "https://imgur.com/a/cCmIs1m"; // tu link directo
    doc.image(logoURL, 50, 30, { width: 80 });



  // Logo alineado a la izquierda, más grande
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 25, { width: 80 });
  }

  // Títulos centrados
  doc.font("Helvetica-Bold").fontSize(18).text("NETLINK PERÚ", 0, 35, { align: "center" });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(14).text(title, { align: "center" });

  // Mostrar rango de fechas (si existe)
  if (filtro.desde || filtro.hasta) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).text(`Rango: ${filtro.desde || "---"} hasta ${filtro.hasta || "---"}`, {
      align: "center",
    });
  }

  doc.moveDown(1.5);
}

/* =======================================================
   🔻 PIE DE PÁGINA CON LÍNEA SEPARADORA Y FECHA
======================================================= */
function addFooter(doc) {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    // Línea separadora gris
    const y = doc.page.height - 45;
    doc.strokeColor("#cccccc").moveTo(40, y).lineTo(doc.page.width - 40, y).stroke();

    // Texto inferior
    doc.fontSize(8).fillColor("gray")
      .text(
        `Generado automáticamente por el sistema - Página ${i + 1} de ${pageCount}`,
        40,
        doc.page.height - 35,
        { align: "right", oblique: true }
      );
  }
}


/* =======================================================
   ✅ REPORTE: ASISTENCIAS
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
    if (rows.length === 0)
      return res.status(404).json({ mensaje: "No hay asistencias registradas en ese rango." });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_asistencias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    addHeader(doc, "REPORTE DE ASISTENCIAS", { desde, hasta });

    const headers = ["Nº", "Nombres", "Apellidos", "Fecha", "Entrada", "Salida", "Observaciones"];
    const tableData = rows.map(r => [
      r.nombres, r.apellidos,
      r.fecha ? new Date(r.fecha).toISOString().split("T")[0] : "-",
      r.hora_entrada || "-", r.hora_salida || "-", r.observaciones || "-"
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
   ✅ REPORTE: TRABAJADORES
======================================================= */
router.get("/trabajadores", async (req, res) => {
  try {
    const [rows] = await connection.query(`SELECT nombres, apellidos, dni, cargo FROM trabajadores ORDER BY apellidos ASC`);
    if (rows.length === 0)
      return res.status(404).json({ message: "No hay trabajadores registrados" });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_trabajadores.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    addHeader(doc, "LISTA DE TRABAJADORES");

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
   ✅ REPORTE: MAQUINARIAS (HORIZONTAL)
======================================================= */
router.get("/maquinarias", async (req, res) => {
  try {
    const [rows] = await connection.query(`
      SELECT codigo, nombre, tipo, marca, modelo, placa, estado
      FROM maquinarias
      ORDER BY estado DESC, nombre ASC
    `);
    if (rows.length === 0)
      return res.status(404).json({ message: "No hay maquinarias registradas" });

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_maquinarias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    addHeader(doc, "LISTA DE MAQUINARIAS");

    const headers = ["Nº", "Código", "Nombre", "Tipo", "Marca", "Modelo", "Placa", "Estado"];
    const tableData = rows.map(m => [
      m.codigo, m.nombre, m.tipo, m.marca, m.modelo, m.placa, m.estado
    ]);
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
   ✅ REPORTE: REGISTRO DE MAQUINARIAS (HORIZONTAL + FILTRO)
======================================================= */
router.get("/maquinarias/registro", async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let query = `
      SELECT rm.id, m.nombre AS maquinaria,
             CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
             rm.fecha, rm.hora_entrada, rm.hora_salida,
             rm.tipo_trabajo, rm.observaciones
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
    if (rows.length === 0)
      return res.status(404).json({ mensaje: "No hay registros de maquinarias." });

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_registro_maquinarias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    addHeader(doc, "REGISTRO DE INGRESOS Y SALIDAS DE MAQUINARIAS", { desde, hasta });

    const headers = ["Nº", "Maquinaria", "Trabajador", "Fecha", "Entrada", "Salida", "Tipo trabajo", "Observaciones"];
    const tableData = rows.map(r => [
      r.maquinaria, r.trabajador,
      r.fecha ? new Date(r.fecha).toISOString().split("T")[0] : "-",
      r.hora_entrada || "-", r.hora_salida || "-",
      r.tipo_trabajo || "-", r.observaciones || "-"
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
   ✅ REPORTE: ESTADÍSTICAS (DÍAS TRABAJADOS + MATERIALES)
   GET /api/reportes/estadisticas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
======================================================= */
router.get("/estadisticas", async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    // ----------- SQL base + filtros -----------
    const whereAsis = [];
    const valsAsis = [];
    if (desde && hasta) { whereAsis.push("a.fecha BETWEEN ? AND ?"); valsAsis.push(desde, hasta); }

    const whereReg = [];
    const valsReg = [];
    if (desde && hasta) { whereReg.push("rm.fecha BETWEEN ? AND ?"); valsReg.push(desde, hasta); }

    // 1) Total de días trabajados (asistencias)
    const sqlDiasTrab = `
      SELECT COUNT(DISTINCT a.fecha) AS dias_trabajados
      FROM asistencias a
      ${whereAsis.length ? "WHERE " + whereAsis.join(" AND ") : ""}
    `;
    const [[diasRow]] = await connection.query(sqlDiasTrab, valsAsis);
    const diasTrabajados = diasRow?.dias_trabajados || 0;

    // 2) Desglose diario: fecha, #trabajadores presentes, #maquinarias activas
    const sqlDesgloseTrab = `
      SELECT 
        a.fecha,
        COUNT(DISTINCT a.id_trabajador) AS trabajadores_presentes
      FROM asistencias a
      ${whereAsis.length ? "WHERE " + whereAsis.join(" AND ") : ""}
      GROUP BY a.fecha
      ORDER BY a.fecha ASC
    `;
    const [desgloseAsist] = await connection.query(sqlDesgloseTrab, valsAsis);

    const sqlDesgloseMaq = `
      SELECT 
        rm.fecha,
        COUNT(DISTINCT rm.id_maquinaria) AS maquinarias_activas
      FROM registro_maquinaria rm
      ${whereReg.length ? "WHERE " + whereReg.join(" AND ") : ""}
      GROUP BY rm.fecha
      ORDER BY rm.fecha ASC
    `;
    const [desgloseReg] = await connection.query(sqlDesgloseMaq, valsReg);

    // Unir desglose por fecha (asistencias + maquinarias)
    const mapa = new Map();
    desgloseAsist.forEach(r => {
      mapa.set(r.fecha.toISOString().split("T")[0], {
        fecha: r.fecha.toISOString().split("T")[0],
        trabajadores_presentes: r.trabajadores_presentes,
        maquinarias_activas: 0
      });
    });
    desgloseReg.forEach(r => {
      const key = r.fecha.toISOString().split("T")[0];
      if (!mapa.has(key)) {
        mapa.set(key, { fecha: key, trabajadores_presentes: 0, maquinarias_activas: r.maquinarias_activas });
      } else {
        mapa.get(key).maquinarias_activas = r.maquinarias_activas;
      }
    });
    const desgloseUnificado = Array.from(mapa.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // 3) Totales por tipo de trabajo (toneladas)
    const sqlMateriales = `
      SELECT 
        COALESCE(rm.tipo_trabajo, 'Sin especificar') AS tipo_trabajo,
        ROUND(SUM(COALESCE(rm.toneladas_movidas, 0)), 2) AS total_toneladas
      FROM registro_maquinaria rm
      ${whereReg.length ? "WHERE " + whereReg.join(" AND ") : ""}
      GROUP BY rm.tipo_trabajo
      ORDER BY total_toneladas DESC
    `;
    const [materiales] = await connection.query(sqlMateriales, valsReg);

    // Si no hay nada en ambos, devolvemos 404
    if (!desgloseUnificado.length && (!materiales || materiales.length === 0) && diasTrabajados === 0) {
      return res.status(404).json({ message: "No hay datos en el rango solicitado." });
    }

    // ----------- Generar PDF -----------
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_estadisticas_operaciones.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    addHeader(doc, "RESUMEN ESTADÍSTICO DE OPERACIONES", { desde, hasta });

    // KPI principal: total días trabajados
    doc.font("Helvetica-Bold").fontSize(12).text("Total de días trabajados:", 40, doc.y);
    doc.font("Helvetica-Bold").fontSize(18).text(String(diasTrabajados), 220, doc.y - 16);
    doc.moveDown(1);

    // Sección A: Desglose diario
    doc.font("Helvetica-Bold").fontSize(12).text("A) Desglose diario de actividad", 40, doc.y);
    doc.moveDown(0.5);

    const headersA = ["Nº", "Fecha", "Trabajadores presentes", "Maquinarias activas"];
    const rowsA = (desgloseUnificado.length ? desgloseUnificado : []).map(d => [
      d.fecha,
      d.trabajadores_presentes,
      d.maquinarias_activas
    ]);
    const widthsA = [30, 120, 180, 160];

    drawTable(doc, headersA, rowsA, doc.y + 10, 20, widthsA, 842);

    doc.moveDown(1.5);

    // Sección B: Totales por tipo de trabajo
    doc.font("Helvetica-Bold").fontSize(12).text("B) Totales por tipo de trabajo (toneladas)", 40, doc.y);
    doc.moveDown(0.5);

    const headersB = ["Nº", "Tipo de trabajo", "Toneladas totales"];
    const rowsB = (materiales.length ? materiales : []).map(m => [
      m.tipo_trabajo,
      (m.total_toneladas ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);
    const widthsB = [30, 300, 180];

    drawTable(doc, headersB, rowsB, doc.y + 10, 20, widthsB, 842);

    addFooter(doc);
    doc.end();
  } catch (error) {
    console.error("Error al generar reporte de estadísticas:", error);
    res.status(500).json({ error: "Error al generar el reporte de estadísticas" });
  }
});


export default router;
