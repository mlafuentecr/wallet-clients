const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.SIGNER_BEARER || ""}`) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const body = req.body || {};
  const objectId = (body.object_id || "").trim();
  const classIdFull = (body.class_id_full || "").trim();

  if (!objectId || !classIdFull) {
    return res.status(400).json({ ok: false, message: "Faltan object_id y class_id_full" });
  }

  const lang = (body.lang || "es-CR").trim();
  const cardTitle = (body.card_title || body.title || "Wallet Pass").trim();
  const header = (body.header || body.target_name || "Cliente").trim();
  const subheader = (body.subheader || "Acceso").trim();
  const passType = String(body.pass_type || process.env.GOOGLE_PASS_TYPE || "eventTicket").toLowerCase();

  const genericObject = {
    id: objectId,
    classId: classIdFull,
    state: "ACTIVE",
    cardTitle: {
      defaultValue: {
        language: lang,
        value: cardTitle
      }
    },
    header: {
      defaultValue: {
        language: lang,
        value: header
      }
    },
    subheader: {
      defaultValue: {
        language: lang,
        value: subheader
      }
    }
  };

  const objectsPayload =
    passType === "generic"
      ? { genericObjects: [genericObject] }
      : {
          eventTicketObjects: [
            {
              id: objectId,
              classId: classIdFull,
              state: "ACTIVE"
            }
          ]
        };

  const payload = {
    iss: process.env.GOOGLE_CLIENT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    origins: [],
    payload: objectsPayload
  };

  try {
    const token = jwt.sign(payload, (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"), {
      algorithm: "RS256",
      header: { alg: "RS256", typ: "JWT" }
    });

    res.status(200).json({
      ok: true,
      pass_type: passType === "generic" ? "genericObjects" : "eventTicketObjects",
      jwt: token,
      save_url: `https://pay.google.com/gp/v/save/${token}`
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: "sign failed", error: String(e.message || e) });
  }
};
