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
   🔹 ENCABEZADO CON LOGO Y TÍTULOS CENTRADOS REALES
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

  // 🔹 Alinear el texto al centro del documento (sin desplazarse por el logo)
  const pageWidth = doc.page.width;
  const centerX = pageWidth / 2;

  doc.font("Helvetica-Bold").fontSize(18)
    .text("NETLINK PERÚ", centerX - 100, 40, { width: 200, align: "center" });

  doc.font("Helvetica-Bold").fontSize(13)
    .text(title, centerX - 150, 65, { width: 300, align: "center" });

  // 🔹 Mostrar rango de fechas si existe
  if (filtro.desde || filtro.hasta) {
    doc.font("Helvetica").fontSize(10)
      .text(`Rango: ${filtro.desde || "---"} hasta ${filtro.hasta || "---"}`, centerX - 150, 85, {
        width: 300,
        align: "center"
      });
  }

  // 🔹 Reducir espacio entre encabezado y tabla (evita salto de página)
  doc.moveDown(0.3);
}
/* =======================================================
   🔻 PIE DE PÁGINA CON LÍNEA Y NUMERACIÓN
======================================================= */
function addFooter(doc) {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    const y = doc.page.height - 45;
    doc.strokeColor("#cccccc")
      .moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .stroke();

    doc.fontSize(8).fillColor("gray")
      .text(`Generado automáticamente - Página ${i + 1} de ${pageCount}`,
        0, doc.page.height - 35,
        { align: "center", width: doc.page.width });
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
   🔹 GRÁFICO DE TONELADAS (QuickChart) — versión segura
======================================================= */
if (materiales.length > 0) {
  const chartURL = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: "bar",
    data: {
      labels: materiales.map(m => m.tipo_trabajo),
      datasets: [{
        label: "Toneladas movidas",
        data: materiales.map(m => m.total_toneladas),
        backgroundColor: "rgba(54, 162, 235, 0.7)"
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: "Toneladas por tipo de trabajo" },
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: "#000" } },
        y: { beginAtZero: true, ticks: { color: "#000" } }
      }
    }
  }))}`;

  try {
    const response = await fetch(chartURL);
    if (!response.ok) throw new Error("No se pudo obtener el gráfico remoto");

    const chartArrayBuffer = await response.arrayBuffer();
    const chartBuffer = Buffer.from(chartArrayBuffer);

    // Nueva página para el gráfico
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(14).text("Gráfico de tonelaje por tipo de trabajo", 40, 60);
    doc.image(chartBuffer, 60, 100, { width: 680 });

  } catch (err) {
    console.error("⚠️ No se pudo generar el gráfico:", err.message);

    // Si falla el gráfico, mostrar aviso en el PDF
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("red")
       .text("⚠️ No se pudo generar el gráfico estadístico.", 40, 100);
    doc.fillColor("black");
  }
}



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
