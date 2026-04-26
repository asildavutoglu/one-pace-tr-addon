const express = require("express");
const fs = require("fs");
const path = require("path");

const mapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, "subs", "mapping.json"), "utf8")
);

const manifest = {
  id: "tr.onepace.subtitles",
  version: "1.0.0",
  name: "One Pace Türkçe Altyazı",
  description: "One Pace bölümleri için Türkçe altyazı (ASS + SRT)",
  logo: "https://onepace.net/images/one-pace-logo.svg",
  resources: ["subtitles"],
  types: ["series"],
  idPrefixes: ["RO_","OR_","SY_","GA_","BA_","AR_","LO_","AL_","RE_","WH_","KO_","LG_","DR_","LI_","JA_","SK_","SA_","AM_","ID_","MA_","PW_","FI_","ZO_","GR_","WA_"],
  catalogs: [],
};

const BASE_URL = process.env.BASE_URL || "http://localhost:7000";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

app.get("/subtitles/:type/:id.json", (req, res) => {
  const { type, id } = req.params;
  console.log("İstek geldi:", id);

  const entry = mapping[id];
  console.log("Entry:", entry);

  if (!entry) {
    return res.json({ subtitles: [] });
  }

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

  console.log("Döndürülen altyazılar:", subtitles);
  res.json({ subtitles });
});

app.use("/subs", express.static(path.join(__dirname, "subs")));

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`One Pace TR Subtitle Addon çalışıyor!`);
  console.log(`Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`Toplam bölüm: ${Object.keys(mapping).length}`);
});