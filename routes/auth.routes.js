// backend/routes/auth.routes.js
import { Router } from "express";
import connection from "../config/db.js";

const router = Router();

/**
 * POST /api/auth/login
 * Body: { identifier: "usuario_o_email", password: "contraseña" }
 */
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ ok: false, error: "Usuario y contraseña son obligatorios." });
  }

  try {
    // Buscar por username O email
    const [rows] = await connection.query(
      `
      SELECT id, username, email, password, id_rol, estado
      FROM usuarios
      WHERE (username = ? OR email = ?)
      LIMIT 1
    `,
      [identifier, identifier]
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ ok: false, error: "Usuario o contraseña incorrectos." });
    }

    const user = rows[0];

    // Verificar estado
    if (user.estado !== "activo") {
      return res
        .status(403)
        .json({ ok: false, error: "El usuario está inactivo." });
    }

    // ⚠️ Comparación simple (sin hash) porque tus contraseñas están en texto.
    // Si luego quieres usar bcrypt, lo cambiamos.
    if (user.password !== password) {
      return res
        .status(401)
        .json({ ok: false, error: "Usuario o contraseña incorrectos." });
    }

    // No mandamos la contraseña al frontend
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      id_rol: user.id_rol,
      estado: user.estado,
    };

    return res.json({
      ok: true,
      message: "Login correcto.",
      user: userResponse,
    });
  } catch (err) {
    console.error("Error en /api/auth/login:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Error interno en el servidor de login." });
  }
});

export default router;
