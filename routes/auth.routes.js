// backend/routes/auth.routes.js
import express from "express";
import connection from "../config/db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await connection.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];

    // Comparación directa (más adelante podemos usar bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    if (user.estado !== "activo") {
      return res.status(403).json({
        error: "El usuario está inactivo. Contacte al administrador.",
      });
    }

    res.json({
      message: "Login exitoso",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        id_rol: user.id_rol,
        estado: user.estado,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
