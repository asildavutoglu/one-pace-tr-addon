const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const fs = require("fs");
const path = require("path");

const mapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, "subs", "mapping.json"), "utf8")
);

const BASE_URL = process.env.BASE_URL || "http://localhost:7000";

const builder = new addonBuilder({
  id: "tr.onepace.subtitles",
  version: "1.0.0",
  name: "One Pace Türkçe Altyazı",
  description: "One Pace bölümleri için Türkçe altyazı",
  logo: "https://onepace.net/images/one-pace-logo.svg",
  resources: ["subtitles"],
  types: ["series"],
  idPrefixes: ["RO_","OR_","SY_","GA_","BA_","AR_","LO_","AL_","RE_","WH_","KO_","LG_","DR_","LI_","JA_","SK_","SA_","AM_","ID_","MA_","PW_","FI_","ZO_","GR_","WA_","CSA_","EL_"],
  catalogs: [],
});

builder.defineSubtitlesHandler(({ id, type }) => {
  console.log("Subtitle request:", type, id);
  const entry = mapping[id];
  if (!entry) return Promise.resolve({ subtitles: [] });

  const subtitles = [];

  if (entry.ass) {
    subtitles.push({
      id: `onepace-tr-ass-${id}`,
      url: `${BASE_URL}/subs/${entry.ass}`,
      lang: "tur",
      name: "Türkçe (Styled)",
    });
  }

  if (entry.srt) {
    subtitles.push({
      id: `onepace-tr-srt-${id}`,
      url: `${BASE_URL}/subs/${entry.srt}`,
      lang: "tur",
      name: "Türkçe",
    });
  }

  return Promise.resolve({ subtitles });
});

const addonInterface = builder.getInterface();

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.use("/subs", express.static(path.join(__dirname, "subs"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".ass")) res.setHeader("Content-Type", "text/x-ssa; charset=utf-8");
    if (filePath.endsWith(".srt")) res.setHeader("Content-Type", "text/plain; charset=utf-8");
  }
}));

app.get("/manifest.json", (req, res) => res.json(addonInterface.manifest));

app.get("/:resource/:type/:id.json", async (req, res) => {
  const { resource, type, id } = req.params;
  try {
    const result = await addonInterface.get({ resource, type, id });
    res.json(result);
  } catch(e) {
    console.error(e);
    res.json({ subtitles: [] });
  }
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Çalışıyor: http://localhost:${PORT}/manifest.json`);
  console.log(`Toplam: ${Object.keys(mapping).length} bölüm`);
});