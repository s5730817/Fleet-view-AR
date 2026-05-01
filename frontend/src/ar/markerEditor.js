const solveLinearSystem = (A, b) => {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i += 1) {
    let pivot = i;
    for (let j = i + 1; j < n; j += 1) {
      if (Math.abs(M[j][i]) > Math.abs(M[pivot][i])) {
        pivot = j;
      }
    }
    if (Math.abs(M[pivot][i]) < 1e-12) {
      throw new Error("Singular matrix");
    }
    [M[i], M[pivot]] = [M[pivot], M[i]];
    const divisor = M[i][i];
    for (let j = i; j <= n; j += 1) {
      M[i][j] /= divisor;
    }
    for (let j = 0; j < n; j += 1) {
      if (j === i) continue;
      const factor = M[j][i];
      for (let k = i; k <= n; k += 1) {
        M[j][k] -= factor * M[i][k];
      }
    }
  }
  return M.map((row) => row[n]);
};

const computeHomography = (src, dst) => {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i += 1) {
    const { x: xs, y: ys } = src[i];
    const { x: xd, y: yd } = dst[i];
    A.push([xs, ys, 1, 0, 0, 0, -xs * xd, -ys * xd]);
    b.push(xd);
    A.push([0, 0, 0, xs, ys, 1, -xs * yd, -ys * yd]);
    b.push(yd);
  }
  const h = solveLinearSystem(A, b);
  return [...h, 1];
};

const applyHomography = (H, x, y) => {
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H;
  const w = h6 * x + h7 * y + h8;
  return {
    x: (h0 * x + h1 * y + h2) / w,
    y: (h3 * x + h4 * y + h5) / w,
  };
};

const sampleBilinear = (data, width, height, x, y) => {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const a = x - x0;
  const b = y - y0;
  const offset = (row, col) => (row * width + col) * 4;
  const sample = (row, col, channel) => data[offset(row, col) + channel];
  const result = [0, 0, 0, 0];
  for (let channel = 0; channel < 4; channel += 1) {
    const v00 = sample(y0, x0, channel);
    const v10 = sample(y0, x1, channel);
    const v01 = sample(y1, x0, channel);
    const v11 = sample(y1, x1, channel);
    result[channel] =
      v00 * (1 - a) * (1 - b) +
      v10 * a * (1 - b) +
      v01 * (1 - a) * b +
      v11 * a * b;
  }
  return result;
};

const warpPerspective = (sourceCanvas, srcCorners, destWidth, destHeight) => {
  const srcCtx = sourceCanvas.getContext("2d");
  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;
  const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight).data;
  const destCanvas = document.createElement("canvas");
  destCanvas.width = destWidth;
  destCanvas.height = destHeight;
  const destCtx = destCanvas.getContext("2d");
  const destData = destCtx.createImageData(destWidth, destHeight);
  const dstCorners = [
    { x: 0, y: 0 },
    { x: destWidth - 1, y: 0 },
    { x: destWidth - 1, y: destHeight - 1 },
    { x: 0, y: destHeight - 1 },
  ];
  const transform = computeHomography(dstCorners, srcCorners);
  for (let y = 0; y < destHeight; y += 1) {
    for (let x = 0; x < destWidth; x += 1) {
      const { x: sampleX, y: sampleY } = applyHomography(transform, x, y);
      const pixel = sampleBilinear(srcData, srcWidth, srcHeight, sampleX, sampleY);
      const offset = (y * destWidth + x) * 4;
      destData.data[offset] = pixel[0];
      destData.data[offset + 1] = pixel[1];
      destData.data[offset + 2] = pixel[2];
      destData.data[offset + 3] = pixel[3];
    }
  }
  destCtx.putImageData(destData, 0, 0);
  return destCanvas.toDataURL("image/png");
};

export const createInitialCorners = (width, height) => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
];

export const applyCropToDataUrl = async (imageUrl, corners, width, height) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = image.naturalWidth;
      sourceCanvas.height = image.naturalHeight;
      const ctx = sourceCanvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to create canvas context."));
        return;
      }
      ctx.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
      const scaledCorners = corners.map((corner) => ({
        x: (corner.x / width) * sourceCanvas.width,
        y: (corner.y / height) * sourceCanvas.height,
      }));
      const destWidth = Math.max(1, Math.round(Math.hypot(scaledCorners[1].x - scaledCorners[0].x, scaledCorners[1].y - scaledCorners[0].y)));
      const destHeight = Math.max(1, Math.round(Math.hypot(scaledCorners[3].x - scaledCorners[0].x, scaledCorners[3].y - scaledCorners[0].y)));
      const cropped = warpPerspective(sourceCanvas, scaledCorners, destWidth, destHeight);
      resolve(cropped);
    };
    image.onerror = reject;
    image.src = imageUrl;
  });
};
