const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const auth = req.headers.authorization || "";
  const expected = `Bearer ${process.env.SIGNER_BEARER || ""}`;
  if (!process.env.SIGNER_BEARER || auth !== expected) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ ok: false, message: "JSON inválido" });
    }
  }

  const objectId = (body.object_id || "").trim();
  const classIdFull = (body.class_id_full || "").trim();

  if (!objectId || !classIdFull) {
    return res.status(400).json({
      ok: false,
      message: "Faltan object_id y class_id_full"
    });
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || "";
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return res.status(500).json({
      ok: false,
      message: "Faltan variables GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY"
    });
  }

  const payload = {
    iss: clientEmail,
    aud: "google",
    typ: "savetowallet",
    origins: [],
    payload: {
      genericObjects: [
        {
          id: objectId,
          classId: classIdFull
        }
      ]
    }
  };

  try {
    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      header: { alg: "RS256", typ: "JWT" }
    });

    return res.status(200).json({
      ok: true,
      jwt: token,
      save_url: `https://pay.google.com/gp/v/save/${token}`
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: "sign failed",
      error: String(e.message || e)
    });
  }
};
