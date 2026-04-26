const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
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
  catalogs: [],
};

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(({ type, id, extra }) => {
  const videoID = (extra && extra.videoID) || id;
  console.log(`İstek: type=${type} id=${id} videoID=${videoID}`);

  const entry = mapping[videoID];
  if (!entry) {
    console.log(`  Bulunamadı: ${videoID}`);
    return Promise.resolve({ subtitles: [] });
  }

  const subtitles = [];

  if (entry.srt) {
    subtitles.push({
      id: `onepace-tr-srt-${videoID}`,
      url: `${SUBS_BASE_URL}/${entry.srt}`,
      lang: "tur",
    });
  }

  if (entry.ass) {
    subtitles.push({
      id: `onepace-tr-ass-${videoID}`,
      url: `${SUBS_BASE_URL}/${entry.ass}`,
      lang: "tur",
      title: "Türkçe (Styled)",
    });
  }

  console.log(`  ${videoID} → ${subtitles.length} altyazı`);
  return Promise.resolve({ subtitles });
});

const PORT = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: PORT }).then(() => {
  console.log(`One Pace TR Addon çalışıyor!`);
  console.log(`Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`Toplam: ${Object.keys(mapping).length} bölüm`);
});