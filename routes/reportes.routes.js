import express from "express";
import PDFDocument from "pdfkit";
import connection from "../config/db.js";
import fetch from "node-fetch";

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
   🔹 ENCABEZADO CON LOGO Y TÍTULOS CENTRADOS REALES (AZUL)
======================================================= */
async function addHeader(doc, title, filtro = {}) {
  const logoURL = "https://minecontrol-backend.onrender.com/logo.png";

  // 🔹 Intentar cargar el logo desde Render
  try {
    const response = await fetch(logoURL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const logoBuffer = Buffer.from(arrayBuffer);
    doc.image(logoBuffer, 60, 35, { width: 70 });
  } catch (error) {
    console.error("⚠️ No se pudo cargar el logo:", error.message);
  }

  // 🔹 Alinear el texto al centro del documento
  const pageWidth = doc.page.width;
  const centerX = pageWidth / 2;

  // 🔹 Título principal azul (similar al color del logo)
  doc.fillColor("#004b87")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("NETLINK PERÚ", centerX - 110, 35, { width: 220, align: "center" });

  // 🔹 Subtítulo negro
  doc.fillColor("black")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(title, centerX - 160, 70, { width: 320, align: "center" });

  // 🔹 Mostrar rango de fechas si existe
  if (filtro.desde || filtro.hasta) {
    doc.moveDown(0.8); // más espacio antes del rango
    doc.font("Helvetica")
      .fontSize(9)
      .text(`Rango: ${filtro.desde || "---"} hasta ${filtro.hasta || "---"}`, { align: "center" });
  }

  // 🔹 Espacio antes de la tabla
  doc.moveDown(1.8);
}

/* =======================================================
   🔻 PIE DE PÁGINA CORREGIDO (sin páginas en blanco)
======================================================= */
function addFooter(doc) {
  try {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Evitar crear nueva página accidentalmente
      const y = doc.page.height - 45;

      // Línea separadora gris
      doc.strokeColor("#cccccc")
        .moveTo(40, y)
        .lineTo(doc.page.width - 40, y)
        .stroke();

      // Texto inferior centrado o a la derecha
      doc.fontSize(8)
        .fillColor("gray")
        .text(
          `Generado automáticamente - Página ${i + 1} de ${pageCount}`,
          40,
          doc.page.height - 35,
          { align: "right" }
        );
    }
  } catch (error) {
    console.error("⚠️ Error al agregar pie de página:", error.message);
  }
}


/* =======================================================
   ✅ 1) REPORTE: TRABAJADORES
======================================================= */
router.get("/trabajadores", async (req, res) => {
  try {
    const [rows] = await connection.query(`SELECT nombres, apellidos, dni, cargo FROM trabajadores ORDER BY apellidos ASC`);
    if (rows.length === 0) return res.status(404).json({ message: "No hay trabajadores registrados" });

    const doc = new PDFDocument({ margins: { top: 40, bottom: 20, left: 40, right: 40 }, size: "A4" });

    res.setHeader("Content-Disposition", "attachment; filename=reporte_trabajadores.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "LISTA DE TRABAJADORES");

    const headers = ["Nº", "Nombres", "Apellidos", "DNI", "Cargo"];
    const tableData = rows.map(t => [t.nombres, t.apellidos, t.dni, t.cargo || "-"]);
    const columnWidths = [30, 120, 120, 100, 150];

    drawTable(doc, headers, tableData, 120, 20, columnWidths);

// 🔹 Evitar salto de página en blanco
if (doc.page === null) {
  doc.addPage();
}

// 🔹 Fijar el pie dentro de la última página real
addFooter(doc);

// 🔹 Terminar el documento correctamente
doc.flushPages();
doc.end();

  } catch (error) {
    console.error("Error al generar reporte de trabajadores:", error);
    res.status(500).json({ error: "Error al generar el reporte de trabajadores" });
  }
});

/* =======================================================
   ✅ 2) REPORTE: ASISTENCIAS
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
    if (rows.length === 0) return res.status(404).json({ mensaje: "No hay asistencias registradas en ese rango." });

    const doc = new PDFDocument({ margins: { top: 40, bottom: 20, left: 40, right: 40 }, size: "A4" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_asistencias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "REPORTE DE ASISTENCIAS", { desde, hasta });

    const headers = ["Nº", "Nombres", "Apellidos", "Fecha", "Entrada", "Salida", "Observaciones"];
    const tableData = rows.map(r => [
      r.nombres, r.apellidos,
      r.fecha ? new Date(r.fecha).toISOString().split("T")[0] : "-",
      r.hora_entrada || "-", r.hora_salida || "-", r.observaciones || "-"
    ]);
    const columnWidths = [30, 90, 90, 70, 60, 60, 100];

   drawTable(doc, headers, tableData, 120, 20, columnWidths);

// 🔹 Evitar salto de página en blanco
if (doc.page === null) {
  doc.addPage();
}

// 🔹 Fijar el pie dentro de la última página real
addFooter(doc);

// 🔹 Terminar el documento correctamente
doc.flushPages();
doc.end();

  } catch (error) {
    console.error("Error al generar reporte de asistencias:", error);
    res.status(500).json({ error: "Error al generar el reporte de asistencias" });
  }
});

/* =======================================================
   ✅ 3) REPORTE: MAQUINARIAS (HORIZONTAL)
======================================================= */
router.get("/maquinarias", async (req, res) => {
  try {
    const [rows] = await connection.query(`
      SELECT codigo, nombre, tipo, marca, modelo, placa, estado
      FROM maquinarias
      ORDER BY estado DESC, nombre ASC
    `);
    if (rows.length === 0) return res.status(404).json({ message: "No hay maquinarias registradas" });

    const doc = new PDFDocument({ margins: { top: 40, bottom: 20, left: 40, right: 40 }, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_maquinarias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "LISTA DE MAQUINARIAS");

    const headers = ["Nº", "Código", "Nombre", "Tipo", "Marca", "Modelo", "Placa", "Estado"];
    const tableData = rows.map(m => [
      m.codigo, m.nombre, m.tipo, m.marca, m.modelo, m.placa, m.estado
    ]);
    const columnWidths = [30, 70, 150, 100, 100, 100, 100, 80];

  drawTable(doc, headers, tableData, 120, 20, columnWidths);

// 🔹 Evitar salto de página en blanco
if (doc.page === null) {
  doc.addPage();
}

// 🔹 Fijar el pie dentro de la última página real
addFooter(doc);

// 🔹 Terminar el documento correctamente
doc.flushPages();
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
    if (rows.length === 0) return res.status(404).json({ mensaje: "No hay registros de maquinarias." });

    const doc = new PDFDocument({ margins: { top: 40, bottom: 20, left: 40, right: 40 }, size: "A4", layout: "landscape" });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_registro_maquinarias.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    await addHeader(doc, "REGISTRO DE INGRESOS Y SALIDAS DE MAQUINARIAS", { desde, hasta });

    const headers = ["Nº", "Maquinaria", "Trabajador", "Fecha", "Entrada", "Salida", "Tipo trabajo", "Observaciones"];
    const tableData = rows.map(r => [
      r.maquinaria, r.trabajador,
      r.fecha ? new Date(r.fecha).toISOString().split("T")[0] : "-",
      r.hora_entrada || "-", r.hora_salida || "-",
      r.tipo_trabajo || "-", r.observaciones || "-"
    ]);
    const columnWidths = [30, 110, 120, 70, 60, 60, 110, 130];

    drawTable(doc, headers, tableData, 120, 20, columnWidths);

// 🔹 Evitar salto de página en blanco
if (doc.page === null) {
  doc.addPage();
}

// 🔹 Fijar el pie dentro de la última página real
addFooter(doc);

// 🔹 Terminar el documento correctamente
doc.flushPages();
doc.end();

  } catch (error) {
    console.error("Error al generar reporte de registro de maquinarias:", error);
    res.status(500).json({ error: "Error al generar el reporte de registro de maquinarias" });
  }
});

/* =======================================================
   ✅ 5) REPORTE: ESTADÍSTICAS DE OPERACIONES
======================================================= */
router.get("/estadisticas", async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    // --- Filtros de fechas dinámicos ---
    const whereAsis = desde && hasta ? `WHERE a.fecha BETWEEN ? AND ?` : "";
    const whereReg = desde && hasta ? `WHERE rm.fecha BETWEEN ? AND ?` : "";
    const params = desde && hasta ? [desde, hasta] : [];

    // --- 1️⃣ Total de días trabajados ---
    const [[dias]] = await connection.query(
      `SELECT COUNT(DISTINCT a.fecha) AS dias_trabajados FROM asistencias a ${whereAsis}`,
      params
    );

    // --- 2️⃣ Desglose diario de actividad ---
    const [desgloseAsist] = await connection.query(
      `SELECT a.fecha, COUNT(DISTINCT a.id_trabajador) AS trabajadores_presentes
       FROM asistencias a
       ${whereAsis}
       GROUP BY a.fecha
       ORDER BY a.fecha ASC`,
      params
    );

    const [desgloseMaq] = await connection.query(
      `SELECT rm.fecha, COUNT(DISTINCT rm.id_maquinaria) AS maquinarias_activas
       FROM registro_maquinaria rm
       ${whereReg}
       GROUP BY rm.fecha
       ORDER BY rm.fecha ASC`,
      params
    );

    // --- Combinar desglose por fecha ---
    const mapa = new Map();
    desgloseAsist.forEach(r => {
      mapa.set(r.fecha.toISOString().split("T")[0], {
        fecha: r.fecha.toISOString().split("T")[0],
        trabajadores_presentes: r.trabajadores_presentes,
        maquinarias_activas: 0
      });
    });
    desgloseMaq.forEach(r => {
      const key = r.fecha.toISOString().split("T")[0];
      if (!mapa.has(key)) {
        mapa.set(key, { fecha: key, trabajadores_presentes: 0, maquinarias_activas: r.maquinarias_activas });
      } else {
        mapa.get(key).maquinarias_activas = r.maquinarias_activas;
      }
    });
    const desglose = Array.from(mapa.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // --- 3️⃣ Totales por tipo de trabajo ---
    const [materiales] = await connection.query(
      `SELECT COALESCE(rm.tipo_trabajo, 'Sin especificar') AS tipo_trabajo,
              ROUND(SUM(COALESCE(rm.toneladas_movidas, 0)), 2) AS total_toneladas
       FROM registro_maquinaria rm
       ${whereReg}
       GROUP BY rm.tipo_trabajo
       ORDER BY total_toneladas DESC`,
      params
    );

    // --- Verificar datos ---
    if (!desglose.length && (!materiales || materiales.length === 0) && dias.dias_trabajados === 0) {
      return res.status(404).json({ error: "No hay datos en el rango solicitado." });
    }

    // --- Crear documento PDF ---
    const doc = new PDFDocument({
      margins: { top: 40, bottom: 20, left: 40, right: 40 },
      size: "A4",
      layout: "landscape",
      bufferPages: true
    });
    res.setHeader("Content-Disposition", "attachment; filename=reporte_estadisticas.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // --- Encabezado ---
    await addHeader(doc, "RESUMEN ESTADÍSTICO DE OPERACIONES", { desde, hasta });

    // --- Total de días trabajados ---
    doc.moveDown(0.5); // 👈 desplazamos el texto debajo del logo
    doc.font("Helvetica-Bold").fontSize(12).text("Total de días trabajados:", 150, doc.y);
    doc.font("Helvetica-Bold").fontSize(18).text(String(dias?.dias_trabajados || 0), 350, doc.y - 16);
    doc.moveDown(1.2);

    // --- Tabla A: Desglose diario ---
    doc.font("Helvetica-Bold").fontSize(12).text("A) Desglose diario de actividad", 40, doc.y);
    doc.moveDown(0.5);

    const headersA = ["Nº", "Fecha", "Trabajadores presentes", "Maquinarias activas"];
    const rowsA = desglose.map(d => [
      d.fecha,
      d.trabajadores_presentes,
      d.maquinarias_activas
    ]);
    const widthsA = [30, 120, 180, 180];
    drawTable(doc, headersA, rowsA, doc.y + 10, 20, widthsA, 842);

    doc.moveDown(1);

    // --- Tabla B: Totales por tipo de trabajo ---
    doc.font("Helvetica-Bold").fontSize(12).text("B) Totales por tipo de trabajo (toneladas)", 40, doc.y);
    doc.moveDown(0.5);

    const headersB = ["Nº", "Tipo de trabajo", "Toneladas totales"];
    const rowsB = materiales.map(m => [
      m.tipo_trabajo,
      (m.total_toneladas ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
    ]);
    const widthsB = [30, 300, 180];
    drawTable(doc, headersB, rowsB, doc.y + 10, 20, widthsB, 842);

    // --- Pie de página ---
    addFooter(doc);
    doc.flushPages();
    doc.end();

  } catch (error) {
    console.error("❌ Error al generar reporte de estadísticas:", error);
    res.status(500).json({ error: "Error al generar el reporte de estadísticas" });
  }
});

/* =======================================================
   ✅ 6) REPORTE GENERAL - TODOS LOS REPORTES EN UN SOLO PDF
======================================================= */
router.get("/todos", async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    const whereA = desde && hasta ? `WHERE a.fecha BETWEEN ? AND ?` : "";
    const whereRM = desde && hasta ? `WHERE rm.fecha BETWEEN ? AND ?` : "";
    const params = desde && hasta ? [desde, hasta] : [];

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      layout: "portrait",
      bufferPages: true
    });

    res.setHeader("Content-Disposition", "attachment; filename=reporte_general.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    /* =======================================================
       PORTADA
    ======================================================== */
    await addHeader(doc, "REPORTE GENERAL DE OPERACIONES", { desde, hasta });
    doc.moveDown(4);
    doc.font("Helvetica").fontSize(12).text("Informe consolidado generado por NetLink Perú", { align: "center" });
    doc.moveDown(2);
    doc.font("Helvetica").fontSize(10).text(
      `Fecha de generación: ${new Date().toLocaleString("es-PE")}`,
      { align: "center" }
    );

    /* =======================================================
       SECCIÓN 1: TRABAJADORES
    ======================================================== */
    doc.addPage();
    await addHeader(doc, "1) LISTA DE TRABAJADORES");
    const [trabajadores] = await connection.query(
      `SELECT nombres, apellidos, dni, cargo FROM trabajadores ORDER BY apellidos ASC`
    );
    if (trabajadores.length) {
      const headers = ["N°", "Nombres", "Apellidos", "DNI", "Cargo"];
      const rows = trabajadores.map(t => [t.nombres, t.apellidos, t.dni, t.cargo || "-"]);
      drawTable(doc, headers, rows, 140, 20, [30, 120, 120, 100, 150]);
    }

    /* =======================================================
       SECCIÓN 2: ASISTENCIAS
    ======================================================== */
    doc.addPage();
    await addHeader(doc, "2) REPORTE DE ASISTENCIAS", { desde, hasta });
    const [asistencias] = await connection.query(
      `SELECT t.nombres, t.apellidos, a.fecha, a.hora_entrada, a.hora_salida, a.observaciones
       FROM asistencias a
       JOIN trabajadores t ON a.id_trabajador = t.id
       ${whereA}
       ORDER BY a.fecha ASC`, params
    );
    if (asistencias.length) {
      const headers = ["N°", "Nombres", "Apellidos", "Fecha", "Entrada", "Salida", "Observaciones"];
      const rows = asistencias.map(a => [
        a.nombres, a.apellidos,
        a.fecha ? new Date(a.fecha).toISOString().split("T")[0] : "-",
        a.hora_entrada || "-", a.hora_salida || "-", a.observaciones || "-"
      ]);
      drawTable(doc, headers, rows, 140, 20, [30, 90, 90, 70, 60, 60, 100]);
    }

    /* =======================================================
       SECCIÓN 3: MAQUINARIAS
    ======================================================== */
    doc.addPage();
    await addHeader(doc, "3) LISTA DE MAQUINARIAS");
    const [maquinarias] = await connection.query(
      `SELECT codigo, nombre, tipo, marca, modelo, placa, estado
       FROM maquinarias
       ORDER BY estado DESC, nombre ASC`
    );
    if (maquinarias.length) {
      const headers = ["N°", "Código", "Nombre", "Tipo", "Marca", "Modelo", "Placa", "Estado"];
      const rows = maquinarias.map(m => [
        m.codigo, m.nombre, m.tipo, m.marca, m.modelo, m.placa, m.estado
      ]);
      drawTable(doc, headers, rows, 140, 20, [30, 70, 150, 100, 100, 100, 100, 80]);
    }

    /* =======================================================
       SECCIÓN 4: REGISTRO DE MAQUINARIAS
    ======================================================== */
    doc.addPage();
    await addHeader(doc, "4) REGISTRO DE MAQUINARIAS", { desde, hasta });
    const [registroMaq] = await connection.query(
      `SELECT m.nombre AS maquinaria,
              CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
              rm.fecha, rm.hora_entrada, rm.hora_salida, rm.tipo_trabajo, rm.observaciones
       FROM registro_maquinaria rm
       JOIN maquinarias m ON rm.id_maquinaria = m.id
       JOIN trabajadores t ON rm.id_trabajador = t.id
       ${whereRM}
       ORDER BY rm.fecha ASC`, params
    );
    if (registroMaq.length) {
      const headers = ["N°", "Maquinaria", "Trabajador", "Fecha", "Entrada", "Salida", "Tipo trabajo", "Observaciones"];
      const rows = registroMaq.map(r => [
        r.maquinaria, r.trabajador,
        r.fecha ? new Date(r.fecha).toISOString().split("T")[0] : "-",
        r.hora_entrada || "-", r.hora_salida || "-",
        r.tipo_trabajo || "-", r.observaciones || "-"
      ]);
      drawTable(doc, headers, rows, 140, 20, [30, 110, 120, 70, 60, 60, 110, 130]);
    }

    /* =======================================================
       SECCIÓN 5: ESTADÍSTICAS
    ======================================================== */
    doc.addPage();
    await addHeader(doc, "5) RESUMEN ESTADÍSTICO DE OPERACIONES", { desde, hasta });
    const [materiales] = await connection.query(
      `SELECT COALESCE(rm.tipo_trabajo, 'Sin especificar') AS tipo_trabajo,
              ROUND(SUM(COALESCE(rm.toneladas_movidas, 0)), 2) AS total_toneladas
       FROM registro_maquinaria rm
       ${whereRM}
       GROUP BY rm.tipo_trabajo
       ORDER BY total_toneladas DESC`,
      params
    );
    if (materiales.length) {
      const headers = ["N°", "Tipo de trabajo", "Toneladas totales"];
      const rows = materiales.map(m => [
        m.tipo_trabajo,
        (m.total_toneladas ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
      ]);
      drawTable(doc, headers, rows, 140, 20, [30, 300, 180]);
    }

    addFooter(doc);
    doc.flushPages();
    doc.end();

  } catch (error) {
    console.error("❌ Error al generar reporte general:", error);
    res.status(500).json({ error: "Error al generar el reporte general" });
  }
});

export default router;
