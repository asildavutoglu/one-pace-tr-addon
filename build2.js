const fs = require("fs");
const path = require("path");

const SOURCE_DIR = "C:\\ass-files";
const OUTPUT_DIR = path.join(__dirname, "subs");

const ARC_MAP = {
  "10 - whisky peak": "WH",
  "11 - the trials of koby-meppo": "COVER_KOBYMEPPO",
  "12 - little garden": "LI",
  "13 - drum island": "DI",
  "15 - jaya": "JA",
  "16 - skypiea": "SK",
  "17 - long ring long land": "LR",
  "18 - water seven": "WS",
  "19 - enies lobby": "EN",
  "20 - post-enies lobby": "PEN",
  "21 - thriller bark": "TB",
  "22 - sabaody archipelago": "SAB",
  "23 - amazon lily": "AM",
  "24 - impel down": "IM",
  "25 - the adventures of the straw hats": "COVER_SHSS",
  "26 - marineford": "MA",
  "27 - post-war": "PW",
  "28 - return to sabaody": "RTS",
  "29 - fishman island": "FI",
  "30 - punk hazard": "PH",
  "31 - dressrosa": "DR",
  "32 - zou": "ZO",
  "33 - whole cake island": "WC",
  "34 - reverie": "REV",
  "8 - loguetown": "LO",
};

console.log("Script başladı");
console.log("SOURCE_DIR:", SOURCE_DIR);

const arcFolders = fs.readdirSync(SOURCE_DIR).filter(f =>
  fs.statSync(path.join(SOURCE_DIR, f)).isDirectory()
);

console.log("Bulunan arc klasörleri:", arcFolders);

const existingMapping = JSON.parse(
  fs.readFileSync(path.join(OUTPUT_DIR, "mapping.json"), "utf8")
);

let added = 0;
let skipped = 0;

for (const arcFolder of arcFolders) {
  const key = arcFolder.toLowerCase().trim();
  const prefix = ARC_MAP[key];

  if (!prefix) {
    console.log(`ATLANDI (prefix yok): "${arcFolder}"`);
    continue;
  }

  console.log(`\nİŞLENİYOR: ${arcFolder} → ${prefix}_`);

  const arcPath = path.join(SOURCE_DIR, arcFolder);
  const epFolders = fs.readdirSync(arcPath).filter(f =>
    fs.statSync(path.join(arcPath, f)).isDirectory()
  );

  for (const epFolder of epFolders) {
    const match = epFolder.match(/^B.l.m\s+(\d+)/i) || epFolder.match(/^\d+/);
    const epNum = match ? parseInt(match[1]) : null;

    if (!epNum) {
      console.log(`  ATLANDI (numara yok): ${epFolder}`);
      skipped++;
      continue;
    }

    const episodeId = `${prefix}_${epNum}`;
    const epPath = path.join(arcPath, epFolder);
    const files = fs.readdirSync(epPath);
    const trAss = files.find(f => f.toLowerCase() === "tr-subtitle.ass");

    if (!trAss) {
      console.log(`  ATLANDI (TR ass yok): ${episodeId}`);
      skipped++;
      continue;
    }

    const destAssName = `${episodeId}.ass`;
    const destAss = path.join(OUTPUT_DIR, destAssName);

    fs.copyFileSync(path.join(epPath, trAss), destAss);
    existingMapping[episodeId] = existingMapping[episodeId] || {};
    existingMapping[episodeId].ass = destAssName;
    console.log(`  ✅ ${episodeId}`);
    added++;
  }
}

fs.writeFileSync(
  path.join(OUTPUT_DIR, "mapping.json"),
  JSON.stringify(existingMapping, null, 2),
  "utf8"
);

console.log(`\n🎉 Tamamlandı! ${added} eklendi, ${skipped} atlandı`);
console.log(`📄 Toplam mapping: ${Object.keys(existingMapping).length} bölüm`);