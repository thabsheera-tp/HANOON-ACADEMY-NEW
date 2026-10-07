const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePng(size, primaryColor = [124, 58, 237, 255]) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Normalized coords [-1, 1]
      const nx = (x / (width - 1)) * 2 - 1;
      const ny = (y / (height - 1)) * 2 - 1;
      const r = Math.sqrt(nx * nx + ny * ny);

      // Rounded rect mask for app icon (corner radius)
      const cornerR = 0.35;
      const qx = Math.max(Math.abs(nx) - (1 - cornerR), 0);
      const qy = Math.max(Math.abs(ny) - (1 - cornerR), 0);
      const distFromCorner = Math.sqrt(qx * qx + qy * qy);

      if (distFromCorner > cornerR) {
        // Transparent outside rounded icon
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Elegant gradient from #7C3AED (Purple 600) to #4338CA (Indigo 700)
      const grad = (y / height);
      const red = Math.round(124 - grad * 35);
      const green = Math.round(58 + grad * 15);
      const blue = Math.round(237 - grad * 20);

      // Central Graduation cap diamond motif
      // Diamond: |nx| * 1.6 + |ny + 0.1| * 2.2 < 0.6
      const inCapTop = (Math.abs(nx) * 1.5 + Math.abs(ny + 0.08) * 2.8) < 0.65;
      const inCapBase = (Math.abs(nx) < 0.35 && ny > 0.12 && ny < 0.38);

      if (inCapTop || inCapBase) {
        // White emblem with slight soft edge
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset] = red;
        rawData[pixelOffset + 1] = green;
        rawData[pixelOffset + 2] = blue;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCrc]);

  // IDAT chunk
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(deflated.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, deflated])), 0);
  const idatChunk = Buffer.concat([idatLen, idatType, deflated, idatCrc]);

  // IEND chunk
  const iendLen = Buffer.alloc(4);
  iendLen.writeUInt32BE(0, 0);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendChunk = Buffer.concat([iendLen, iendType, iendCrc]);

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), makePng(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), makePng(512));
console.log('Successfully generated PWA icon-192.png and icon-512.png');
