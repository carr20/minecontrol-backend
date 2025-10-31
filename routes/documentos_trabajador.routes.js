import express from "express";
import connection from "../config/db.js";

const router = express.Router();

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
    const [rows] = await connection.query("SELECT * FROM documentos_trabajador WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Documento no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener documento:", error);
    res.status(500).json({ error: "Error al obtener documento" });
  }
});

// ✅ Registrar un nuevo documento
router.post("/", async (req, res) => {
  try {
    const { id_trabajador, tipo_documento, nombre_archivo, ruta_archivo } = req.body;

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
    const { id_trabajador, tipo_documento, nombre_archivo, ruta_archivo } = req.body;
    await connection.query(
      `UPDATE documentos_trabajador 
       SET id_trabajador=?, tipo_documento=?, nombre_archivo=?, ruta_archivo=? 
       WHERE id=?`,
      [id_trabajador, tipo_documento, nombre_archivo, ruta_archivo, req.params.id]
    );

    res.json({ message: "✅ Documento actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar documento:", error);
    res.status(500).json({ error: "Error al actualizar documento" });
  }
});

// ✅ Eliminar documento
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM documentos_trabajador WHERE id = ?", [req.params.id]);
    res.json({ message: "🗑️ Documento eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar documento:", error);
    res.status(500).json({ error: "Error al eliminar documento" });
  }
});

export default router;
