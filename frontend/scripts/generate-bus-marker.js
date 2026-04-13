/**
 * 카카오맵 스타일 버스 정류장 마커 PNG 생성
 * 실행: node scripts/generate-bus-marker.js
 *
 * 형태: 원형 핀(상단) + 삼각형 포인터(하단)
 * 색상: #0068C3 (카카오맵 버스 파란색)
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG 인코더 ─────────────────────────────────────────────────────────────
function u32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v, 0); return b; }
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))]);
}
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (1 + w * 4) + 1 + x * 4;
      raw[d] = rgba[s]; raw[d+1] = rgba[s+1]; raw[d+2] = rgba[s+2]; raw[d+3] = rgba[s+3];
    }
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── 픽셀 헬퍼 ─────────────────────────────────────────────────────────────
function blend(buf, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y * w >= buf.length / 4) return;
  const i = (y * w + x) * 4;
  const sa = a / 255, da = buf[i+3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  buf[i]   = Math.round((r*sa + buf[i]  *da*(1-sa)) / oa);
  buf[i+1] = Math.round((g*sa + buf[i+1]*da*(1-sa)) / oa);
  buf[i+2] = Math.round((b*sa + buf[i+2]*da*(1-sa)) / oa);
  buf[i+3] = Math.round(oa * 255);
}

/** 안티앨리어싱 원 */
function circle(buf, w, cx, cy, r, R, G, B, A=255) {
  for (let y = Math.floor(cy-r-1); y <= Math.ceil(cy+r+1); y++)
    for (let x = Math.floor(cx-r-1); x <= Math.ceil(cx+r+1); x++) {
      const alpha = Math.max(0, Math.min(1, r - Math.hypot(x-cx, y-cy) + 0.5));
      if (alpha > 0) blend(buf, w, x, y, R, G, B, Math.round(A * alpha));
    }
}

/** 채워진 사각형 */
function rect(buf, w, x1, y1, x2, y2, R, G, B, A=255) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      blend(buf, w, x, y, R, G, B, A);
}

/** 안티앨리어싱 삼각형 (edge function 방식) */
function triangle(buf, W, ax, ay, bx, by, cx2, cy2, R, G, B, A=255) {
  const minX = Math.floor(Math.min(ax, bx, cx2)) - 1;
  const maxX = Math.ceil(Math.max(ax, bx, cx2)) + 1;
  const minY = Math.floor(Math.min(ay, by, cy2)) - 1;
  const maxY = Math.ceil(Math.max(ay, by, cy2)) + 1;

  function edgeDist(px, py, ex1, ey1, ex2, ey2) {
    const len = Math.hypot(ex2-ex1, ey2-ey1);
    if (len === 0) return 0;
    return ((px-ex1)*(ey2-ey1) - (py-ey1)*(ex2-ex1)) / len;
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d1 = edgeDist(x, y, ax, ay, bx, by);
      const d2 = edgeDist(x, y, bx, by, cx2, cy2);
      const d3 = edgeDist(x, y, cx2, cy2, ax, ay);
      const inside = Math.min(d1, d2, d3);
      const alpha = Math.max(0, Math.min(1, inside + 0.5));
      if (alpha > 0) blend(buf, W, x, y, R, G, B, Math.round(A * alpha));
    }
  }
}

// ── 마커 드로잉 ────────────────────────────────────────────────────────────
// 캔버스: W x H,  원 상단 + 삼각 하단
// 비율: 원 지름 = W, 캔버스 높이 = W * 1.4
// 카카오맵 버스 색: #0068C3

const PIN_BLUE   = [0,  104, 195];  // #0068C3
const WHITE      = [255, 255, 255];

function drawMarker(W) {
  const H      = Math.round(W * 1.4);
  const buf    = new Uint8Array(W * H * 4);

  const cx     = W / 2;
  const cy     = W / 2;           // 원 중심 (상단)
  const rOuter = W / 2 - 1;       // 흰색 테두리 원
  const rInner = rOuter - W * 0.07; // 파란 원 내부

  // ── 그림자 (살짝 아래에 흐린 타원) ──────────────────────────────
  const shX = cx, shY = H - 2;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -(W*0.3); dx <= W*0.3; dx++) {
      const a = Math.max(0, 1 - (dx*dx)/(W*W*0.09) - (dy*dy)/4) * 60;
      blend(buf, W, Math.round(shX+dx), Math.round(shY+dy), 0, 0, 0, Math.round(a));
    }

  // ── 삼각 포인터 (흰색 테두리용) ──────────────────────────────────
  const tipY   = H - 4;
  const baseY  = cy + rOuter * 0.75;
  const halfBase = rOuter * 0.45;
  triangle(buf, W, cx-halfBase, baseY, cx+halfBase, baseY, cx, tipY, ...WHITE);

  // ── 삼각 포인터 (파란색 내부) ─────────────────────────────────────
  const tipYi  = tipY - W * 0.05;
  const halfBi = halfBase - W * 0.07;
  triangle(buf, W, cx-halfBi, baseY, cx+halfBi, baseY, cx, tipYi, ...PIN_BLUE);

  // ── 원형 배경 ─────────────────────────────────────────────────────
  circle(buf, W, cx, cy, rOuter, ...WHITE);
  circle(buf, W, cx, cy, rInner, ...PIN_BLUE);

  // ── 버스 아이콘 (흰색) ────────────────────────────────────────────
  const p = v => Math.round(cx + v * rInner);  // 원 내부 좌표 헬퍼
  const q = v => Math.round(cy + v * rInner);

  // 차체
  const bx1 = p(-0.62), bx2 = p(0.62);
  const by1 = q(-0.52), by2 = q(0.45);
  rect(buf, W, bx1, by1, bx2, by2, ...WHITE);

  // 차체 상단 라운드 캡 (흰색 원으로 덮어 둥글게)
  circle(buf, W, p(-0.62), q(-0.35), rInner*0.13, ...WHITE);
  circle(buf, W, p( 0.62), q(-0.35), rInner*0.13, ...WHITE);

  // 창문 (파란색 = 뚫린 느낌)
  rect(buf, W, p(-0.56), q(-0.45), p(-0.08), q(-0.05), ...PIN_BLUE);
  rect(buf, W, p( 0.08), q(-0.45), p( 0.56), q(-0.05), ...PIN_BLUE);

  // 바퀴 (파란 원 위에 흰 원 → 파란 동그라미처럼 보임)
  const wR = rInner * 0.17;
  circle(buf, W, p(-0.38), q(0.52), wR, ...WHITE);
  circle(buf, W, p( 0.38), q(0.52), wR, ...WHITE);
  circle(buf, W, p(-0.38), q(0.52), wR*0.55, ...PIN_BLUE);
  circle(buf, W, p( 0.38), q(0.52), wR*0.55, ...PIN_BLUE);

  return { buf, W, H };
}

// ── 생성 ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = path.join(__dirname, '../assets/images');
const targets = [
  { base: 28, suffix: '' },
  { base: 56, suffix: '@2x' },
  { base: 84, suffix: '@3x' },
];

for (const { base, suffix } of targets) {
  const { buf, W, H } = drawMarker(base);
  const png  = encodePNG(W, H, buf);
  const file = path.join(OUTPUT_DIR, `bus-marker${suffix}.png`);
  fs.writeFileSync(file, png);
  console.log(`✓ bus-marker${suffix}.png  (${W}x${H})`);
}
