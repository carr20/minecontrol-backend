// backend/routes/usuarios.routes.js
import express from "express";
import connection from "../config/db.js";
import bcrypt from "bcrypt";

const router = express.Router();
const SALT_ROUNDS = 10;

// ✅ Obtener todos los usuarios
router.get("/", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM usuarios");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// ✅ Obtener un usuario por ID
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await connection.query(
      "SELECT * FROM usuarios WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// ✅ Crear nuevo usuario (password cifrado)
router.post("/", async (req, res) => {
  try {
    const { username, email, password, id_rol, estado } = req.body;

    // ⛑ ciframos la contraseña antes de guardar
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await connection.query(
      "INSERT INTO usuarios (username, email, password, id_rol, estado) VALUES (?, ?, ?, ?, ?)",
      [username, email, hashedPassword, id_rol, estado]
    );
    res.status(201).json({ message: "✅ Usuario creado correctamente" });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ✅ Actualizar usuario (si viene password, se vuelve a cifrar)
router.put("/:id", async (req, res) => {
  try {
    let { username, email, password, id_rol, estado } = req.body;

    // Si el frontend manda una contraseña vacía o null,
    // podrías decidir NO cambiarla. Por ahora asumimos que
    // siempre viene una contraseña válida y la ciframos.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await connection.query(
      "UPDATE usuarios SET username=?, email=?, password=?, id_rol=?, estado=? WHERE id=?",
      [username, email, hashedPassword, id_rol, estado, req.params.id]
    );
    res.json({ message: "✅ Usuario actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ✅ Eliminar usuario
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM usuarios WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "✅ Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
