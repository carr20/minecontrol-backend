import express from "express";
import connection from "../config/db.js";

const router = express.Router();

// ✅ Obtener todas las maquinarias
router.get("/", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM maquinarias");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener maquinarias:", error);
    res.status(500).json({ error: "Error al obtener maquinarias" });
  }
});

// ✅ Obtener una maquinaria por ID
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM maquinarias WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Maquinaria no encontrada" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener maquinaria:", error);
    res.status(500).json({ error: "Error al obtener maquinaria" });
  }
});

// ✅ Agregar nueva maquinaria
router.post("/", async (req, res) => {
  try {
    const { codigo, nombre, tipo, marca, modelo, placa, estado, fecha_registro, horas_acumuladas } = req.body;
    await connection.query(
      "INSERT INTO maquinarias (codigo, nombre, tipo, marca, modelo, placa, estado, fecha_registro, horas_acumuladas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [codigo, nombre, tipo, marca, modelo, placa, estado, fecha_registro, horas_acumuladas]
    );
    res.json({ message: "✅ Maquinaria registrada correctamente" });
  } catch (error) {
    console.error("Error al registrar maquinaria:", error);
    res.status(500).json({ error: "Error al registrar maquinaria" });
  }
});

// ✅ Actualizar maquinaria
router.put("/:id", async (req, res) => {
  try {
    const { codigo, nombre, tipo, marca, modelo, placa, estado, fecha_registro, horas_acumuladas } = req.body;
    await connection.query(
      "UPDATE maquinarias SET codigo=?, nombre=?, tipo=?, marca=?, modelo=?, placa=?, estado=?, fecha_registro=?, horas_acumuladas=? WHERE id=?",
      [codigo, nombre, tipo, marca, modelo, placa, estado, fecha_registro, horas_acumuladas, req.params.id]
    );
    res.json({ message: "✅ Maquinaria actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar maquinaria:", error);
    res.status(500).json({ error: "Error al actualizar maquinaria" });
  }
});

// ✅ Eliminar maquinaria
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM maquinarias WHERE id = ?", [req.params.id]);
    res.json({ message: "🗑️ Maquinaria eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar maquinaria:", error);
    res.status(500).json({ error: "Error al eliminar maquinaria" });
  }
});

export default router;
