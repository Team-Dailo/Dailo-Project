/**
 * 지도 마커용 핀 아이콘 PNG 생성 (tintColor 적용을 위해 흰색 실루엣)
 * 실행: npm run generate-marker-pin (frontend 폴더에서)
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'images');
const outPath = path.join(outDir, 'marker-pin.png');

// 검정(#000000) 핀 실루엣 - tintColor가 이 색을 규모별 색으로 바꿔줌 (흰색은 일부 SDK에서 tint 미적용)
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="48" height="64" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
  <path fill="#000000" d="M24 0C37.255 0 48 10.745 48 24c0 14-24 40-24 40S0 38 0 24C0 10.745 10.745 0 24 0z"/>
</svg>`;

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp가 필요합니다. frontend 폴더에서 실행: npm install sharp --save-dev');
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath);
  console.log('생성됨:', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
