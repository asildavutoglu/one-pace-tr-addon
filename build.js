const fs = require("fs");
const path = require("path");

// One Pace public subtitles reposunun yolu - KENDİ YOLUNLA DEĞİŞTİR
const REPO_PATH = process.argv[2] || "C:\\one-pace-public-subtitles\\main";
const OUTPUT_DIR = path.join(__dirname, "subs");

// Arc adı → ID prefix eşlemesi
const ARC_MAP = {
  "romance dawn": "RO",
  "orange town": "OR",
  "syrup village": "SY",
  "gaimon": "GA",
  "baratie": "BA",
  "arlong park": "AR",
  "loguetown": "LO",
  "alabasta": "AL",
  "reverse mountain": "RE",
  "whisky peak": "WH",
  "koby meppo": "KO",
  "koby-meppo": "KO",
  "little garden": "LG",
  "drum island": "DR",
  "little east blue": "LI",
  "jaya": "JA",
  "skypiea": "SK",
  "long ring long land": "SA",
  "amazon lily": "AM",
  "impel down": "ID",
  "marineford": "MA",
  "post-war": "PW",
  "post war": "PW",
  "fishman island": "FI",
  "fish-man island": "FI",
  "z's ambition": "ZO",
  "punk hazard": "PH",
  "dressrosa": "DS",
  "zou": "ZO",
  "whole cake island": "WC",
  "reverie": "RV",
  "wano": "WA",
  "wano country": "WA",
};

function getArcPrefix(arcFolderName) {
  // "01 Romance Dawn" → "romance dawn"
  const cleaned = arcFolderName.replace(/^\d+\s+/, "").toLowerCase().trim();
  for (const [key, prefix] of Object.entries(ARC_MAP)) {
    if (cleaned.includes(key)) return prefix;
  }
  // Bulunamazsa klasör adından üret
  const words = cleaned.split(" ").filter(Boolean);
  return words.map(w => w[0].toUpperCase()).join("").substring(0, 3);
}

function getEpisodeNumber(epFolderName) {
  return parseInt(epFolderName, 10);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function convertAssToSrt(assContent) {
  const lines = assContent.split("\n");
  let inEvents = false;
  let format = [];
  const entries = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "[Events]") { inEvents = true; continue; }
    if (!inEvents) continue;
    if (trimmed.startsWith("Format:")) {
      format = trimmed.replace("Format:", "").split(",").map(s => s.trim());
      continue;
    }
    if (!trimmed.startsWith("Dialogue:")) continue;

    const parts = trimmed.replace("Dialogue:", "").split(",");
    const obj = {};
    format.forEach((key, i) => {
      obj[key] = i < format.length - 1 ? (parts[i] || "").trim() : parts.slice(i).join(",").trim();
    });

    if (obj.Start && obj.End && obj.Text) {
      const text = obj.Text
        .replace(/\{[^}]*\}/g, "")
        .replace(/\\N/g, "\n")
        .replace(/\\n/g, "\n")
        .trim();
      if (text) entries.push({ start: obj.Start, end: obj.End, text });
    }
  }

  entries.sort((a, b) => a.start.localeCompare(b.start));

  function assTime(t) {
    // 0:00:01.00 → 00:00:01,000
    const [h, m, rest] = t.split(":");
    const [s, cs] = rest.split(".");
    const ms = String(parseInt(cs || "0") * 10).padStart(3, "0");
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${ms}`;
  }

  return entries.map((e, i) =>
    `${i + 1}\n${assTime(e.start)} --> ${assTime(e.end)}\n${e.text}`
  ).join("\n\n");
}

function main() {
  if (!fs.existsSync(REPO_PATH)) {
    console.error(`HATA: Klasör bulunamadı: ${REPO_PATH}`);
    console.error(`Kullanım: node build.js "C:\\one-pace-public-subtitles\\main"`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const mapping = {};
  let total = 0;
  let skipped = 0;

  const arcFolders = fs.readdirSync(REPO_PATH).filter(f => {
    const fullPath = path.join(REPO_PATH, f);
    return fs.statSync(fullPath).isDirectory() && /^\d+/.test(f);
  }).sort();

  for (const arcFolder of arcFolders) {
    const arcPath = path.join(REPO_PATH, arcFolder);
    const prefix = getArcPrefix(arcFolder);
    console.log(`\n📁 ${arcFolder} → prefix: ${prefix}`);

    const epFolders = fs.readdirSync(arcPath).filter(f => {
      return fs.statSync(path.join(arcPath, f)).isDirectory() && /^\d+$/.test(f);
    }).sort((a, b) => parseInt(a) - parseInt(b));

    for (const epFolder of epFolders) {
      const epPath = path.join(arcPath, epFolder);
      const epNum = getEpisodeNumber(epFolder);
      const episodeId = `${prefix}_${epNum}`;

      // Türkçe ASS dosyasını bul
      const files = fs.readdirSync(epPath);
      const trAss = files.find(f => f.toLowerCase().endsWith("tr.ass") || f.toLowerCase().includes(" tr.ass"));

      if (!trAss) {
        console.log(`  ⚠️  ${episodeId}: Türkçe ASS bulunamadı`);
        skipped++;
        continue;
      }

      const srcAss = path.join(epPath, trAss);
      const destAssName = `${episodeId}.ass`;
      const destSrtName = `${episodeId}.srt`;
      const destAss = path.join(OUTPUT_DIR, destAssName);
      const destSrt = path.join(OUTPUT_DIR, destSrtName);

      // ASS kopyala
      copyFile(srcAss, destAss);

      // SRT'ye çevir
      try {
        const assContent = fs.readFileSync(srcAss, "utf8");
        const srtContent = convertAssToSrt(assContent);
        if (srtContent.trim()) {
          fs.writeFileSync(destSrt, srtContent, "utf8");
          mapping[episodeId] = { ass: destAssName, srt: destSrtName };
        } else {
          mapping[episodeId] = { ass: destAssName };
        }
      } catch (e) {
        mapping[episodeId] = { ass: destAssName };
      }

      console.log(`  ✅ ${episodeId} → ${destAssName}`);
      total++;
    }
  }

  // mapping.json kaydet
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "mapping.json"),
    JSON.stringify(mapping, null, 2),
    "utf8"
  );

  console.log(`\n🎉 Tamamlandı!`);
  console.log(`✅ ${total} bölüm işlendi`);
  console.log(`⚠️  ${skipped} bölüm atlandı (Türkçe ASS yok)`);
  console.log(`📄 mapping.json oluşturuldu: ${Object.keys(mapping).length} bölüm`);
}

main();
