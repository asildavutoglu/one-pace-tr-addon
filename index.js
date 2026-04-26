const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const express = require("express");
const fs = require("fs");
const path = require("path");

const mapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, "subs", "mapping.json"), "utf8")
);

const BASE_URL = process.env.BASE_URL || "http://localhost:7000";
const SUBS_BASE_URL = process.env.SUBS_BASE_URL || `${BASE_URL}/subs`;

const manifest = {
  id: "tr.onepace.subtitles",
  version: "1.0.0",
  name: "One Pace Türkçe Altyazı",
  description: "One Pace bölümleri için Türkçe altyazı",
  logo: "https://onepace.net/images/one-pace-logo.svg",
  resources: [{ name: "subtitles", types: ["series"] }],
  types: ["series"],
  idPrefixes: ["RO_","OR_","SY_","GA_","BA_","AR_","LO_","AL_","RE_","WH_","KO_","LG_","DR_","DI_","LI_","JA_","SK_","SA_","AM_","IM_","MA_","PW_","FI_","ZO_","WC_","REV_","WA_","TB_","SAB_","RTS_","PH_","EN_","PEN_","WS_","LR_","COVER_KOBYMEPPO_","COVER_SHSS_","EH_"],
  catalogs: [],
};

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(({ type, id, extra }) => {
  const videoID = (extra && extra.videoID) || id;
  console.log(`İstek: type=${type} id=${id} videoID=${videoID}`);

  const entry = mapping[videoID];
  if (!entry) {
    console.log(`Bulunamadı: ${videoID}`);
    return Promise.resolve({ subtitles: [] });
  }

  const subtitles = [];

  if (entry.srt) {
    subtitles.push({
      id: `onepace-tr-srt-${videoID}`,
      url: `${SUBS_BASE_URL}/${entry.srt}`,
      lang: "tur",
      name: "Türkçe",
    });
  }

  if (entry.ass) {
    subtitles.push({
      id: `onepace-tr-ass-${videoID}`,
      url: `${SUBS_BASE_URL}/${entry.ass}`,
      lang: "tur",
      name: "Türkçe (Styled)",
    });
  }

  console.log(`${videoID} → ${subtitles.length} altyazı`);
  return Promise.resolve({ subtitles });
});

// Static dosya sunucusu ayrı portta
const staticApp = express();
staticApp.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
staticApp.use("/subs", express.static(path.join(__dirname, "subs"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".ass")) res.setHeader("Content-Type", "text/x-ssa; charset=utf-8");
    if (filePath.endsWith(".srt")) res.setHeader("Content-Type", "text/plain; charset=utf-8");
  }
}));
staticApp.listen(7001, () => console.log("Static server: localhost:7001"));

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT }).then(() => {
  console.log(`One Pace TR Addon çalışıyor!`);
  console.log(`Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`Toplam: ${Object.keys(mapping).length} bölüm`);
});