import express from "express";
import connection from "../config/db.js";

// ⭐⭐ NUEVO: para manejar subidas de archivos ⭐⭐
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

/* ======================================================
     ⭐ CONFIGURACIÓN MULTER (NO AFECTA NADA EXISTENTE) ⭐
   ====================================================== */

// Crear carpeta uploads/documentos si no existe
const uploadDir = "uploads/documentos";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nombreFinal = `doc_${Date.now()}${ext}`;
    cb(null, nombreFinal);
  }
});

// Aceptar solo PDF e imágenes
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Máx 5MB
  fileFilter: (req, file, cb) => {
    const tipos = ["application/pdf", "image/jpeg", "image/png"];
    if (!tipos.includes(file.mimetype)) {
      return cb(new Error("Solo se permiten PDF, JPG o PNG"));
    }
    cb(null, true);
  }
});

/* ======================================================
   🔹 RUTA NUEVA PARA SUBIR ARCHIVOS (NO MODIFICA NADA)
   ====================================================== */

router.post("/upload", upload.single("archivo"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    // URL accesible desde el frontend
    const rutaPublica = `/uploads/documentos/${req.file.filename}`;

    return res.json({
      message: "📄 Archivo subido correctamente",
      nombre_archivo: req.file.filename,
      ruta_archivo: rutaPublica
    });

  } catch (error) {
    console.error("Error al subir archivo:", error);
    res.status(500).json({ error: "Error al subir archivo" });
  }
});


/* ======================================================
   🔸 RUTAS ORIGINALES (NO SE MODIFICÓ NADA AQUÍ)
   ====================================================== */

// ✅ Obtener todos los documentos
router.get("/", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM documentos_trabajador");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener documentos:", error);
    res.status(500).json({ error: "Error al obtener documentos" });
  }
});

// ✅ Obtener un documento por ID
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await connection.query(
      "SELECT * FROM documentos_trabajador WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Documento no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener documento:", error);
    res.status(500).json({ error: "Error al obtener documento" });
  }
});

// ✅ Registrar un nuevo documento (SIN tocar)
router.post("/", async (req, res) => {
  try {
    const { id_trabajador, tipo_documento, nombre_archivo, ruta_archivo } =
      req.body;

    await connection.query(
      `INSERT INTO documentos_trabajador (id_trabajador, tipo_documento, nombre_archivo, ruta_archivo, fecha_subida)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_trabajador, tipo_documento, nombre_archivo, ruta_archivo]
    );

    res.status(201).json({ message: "✅ Documento registrado correctamente" });
  } catch (error) {
    console.error("Error al registrar documento:", error);
    res.status(500).json({ error: "Error al registrar documento" });
  }
});

// ✅ Actualizar documento
router.put("/:id", async (req, res) => {
  try {
    const { id_trabajador, tipo_documento, nombre_archivo, ruta_archivo } =
      req.body;
    await connection.query(
      `UPDATE documentos_trabajador 
       SET id_trabajador=?, tipo_documento=?, nombre_archivo=?, ruta_archivo=? 
       WHERE id=?`,
      [
        id_trabajador,
        tipo_documento,
        nombre_archivo,
        ruta_archivo,
        req.params.id
      ]
    );

    res.json({ message: "✅ Documento actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar documento:", error);
    res
      .status(500)
      .json({ error: "Error al actualizar documento" });
  }
});

// ✅ Eliminar documento
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM documentos_trabajador WHERE id = ?", [
      req.params.id
    ]);
    res.json({ message: "🗑️ Documento eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar documento:", error);
    res.status(500).json({ error: "Error al eliminar documento" });
  }
});

export default router;
