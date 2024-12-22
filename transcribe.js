const express = require("express");
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
require("dotenv").config(); // => lit .env

const app = express();
const upload = multer(); // pour parser le multipart/form-data

// Endpoint /api/transcribe
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    const fileBuffer = req.file.buffer; // le blob audio
    const formData = new FormData();
    formData.append("file", fileBuffer, "audio.webm");
    formData.append("model", "whisper-1");

    const openaiResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        // on ne fixe pas "Content-Type": "multipart/form-data", 
        // c'est form-data qui s'en charge
      },
      body: formData
    });

    if (!openaiResp.ok) {
      const errorText = await openaiResp.text();
      return res.status(openaiResp.status).send(errorText);
    }

    const data = await openaiResp.json();
    return res.json(data);
  } catch (err) {
    console.error("Error /api/transcribe:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
