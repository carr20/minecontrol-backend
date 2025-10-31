import express from "express";
import connection from "../config/db.js";


const router = express.Router();

// ✅ Obtener todos los roles
router.get("/", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM roles");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener roles:", error);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

// ✅ Obtener un rol por ID
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM roles WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener rol:", error);
    res.status(500).json({ error: "Error al obtener rol" });
  }
});

// ✅ Crear un nuevo rol
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    await connection.query("INSERT INTO roles (nombre, descripcion) VALUES (?, ?)", [nombre, descripcion]);
    res.status(201).json({ message: "✅ Rol creado correctamente" });
  } catch (error) {
    console.error("Error al crear rol:", error);
    res.status(500).json({ error: "Error al crear rol" });
  }
});

// ✅ Actualizar un rol
router.put("/:id", async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    await connection.query("UPDATE roles SET nombre=?, descripcion=? WHERE id=?", [
      nombre,
      descripcion,
      req.params.id,
    ]);
    res.json({ message: "✅ Rol actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar rol:", error);
    res.status(500).json({ error: "Error al actualizar rol" });
  }
});

// ✅ Eliminar un rol
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM roles WHERE id=?", [req.params.id]);
    res.json({ message: "🗑️ Rol eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar rol:", error);
    res.status(500).json({ error: "Error al eliminar rol" });
  }
});

export default router;
