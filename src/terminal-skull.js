const COLOR_BG = "#020802";
const COLOR_GLOW = "#c8ffb0";
const COLOR_MID = "#7dcc7d";
const COLOR_DARK = "#061806";

/**
 * Crâne phosphore centré sur l'écran minitel (512×256).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} [t=0] Temps en secondes (pulsation légère)
 */
export function drawTerminalSkull(ctx, w, h, t = 0) {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, w, h);

  for (let sy = 0; sy < h; sy += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, sy, w, 1);
  }

  const cx = w * 0.5;
  const cy = h * 0.54;
  const scale = Math.min(w * 0.42, h * 0.88);
  const pulse = 0.94 + Math.sin(t * 1.6) * 0.06;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale * pulse, scale * pulse);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  /** @param {() => void} draw */
  const withGlow = (draw, color = COLOR_GLOW, blur = 16) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(130,255,110,0.95)";
    ctx.shadowBlur = blur;
    draw();
    ctx.shadowBlur = blur * 0.45;
    draw();
    ctx.restore();
  };

  withGlow(() => {
    ctx.beginPath();
    ctx.moveTo(-0.52, -0.05);
    ctx.bezierCurveTo(-0.56, -0.62, -0.34, -0.98, 0, -1);
    ctx.bezierCurveTo(0.34, -0.98, 0.56, -0.62, 0.52, -0.05);
    ctx.bezierCurveTo(0.58, 0.18, 0.52, 0.42, 0.38, 0.58);
    ctx.quadraticCurveTo(0, 0.72, -0.38, 0.58);
    ctx.bezierCurveTo(-0.52, 0.42, -0.58, 0.18, -0.52, -0.05);
    ctx.closePath();
    ctx.fillStyle = COLOR_DARK;
    ctx.fill();
    ctx.lineWidth = 0.055;
    ctx.stroke();
  });

  ctx.fillStyle = COLOR_BG;
  for (const [ex, ey, rx, ry] of [
    [-0.21, -0.2, 0.145, 0.19],
    [0.21, -0.2, 0.145, 0.19],
  ]) {
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  withGlow(
    () => {
      for (const [ex, ey, rx, ry] of [
        [-0.21, -0.2, 0.145, 0.19],
        [0.21, -0.2, 0.145, 0.19],
      ]) {
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
        ctx.lineWidth = 0.038;
        ctx.stroke();
      }
    },
    COLOR_MID,
    10,
  );

  withGlow(
    () => {
      ctx.beginPath();
      ctx.moveTo(0, 0.02);
      ctx.lineTo(0.09, 0.2);
      ctx.quadraticCurveTo(0, 0.34, -0.09, 0.2);
      ctx.closePath();
      ctx.fillStyle = COLOR_BG;
      ctx.fill();
      ctx.lineWidth = 0.034;
      ctx.stroke();
    },
    COLOR_MID,
    8,
  );

  withGlow(() => {
    ctx.beginPath();
    ctx.moveTo(-0.34, 0.46);
    ctx.quadraticCurveTo(0, 0.64, 0.34, 0.46);
    ctx.lineWidth = 0.042;
    ctx.stroke();

    const teethX = [-0.26, -0.13, 0, 0.13, 0.26];
    ctx.beginPath();
    for (const tx of teethX) {
      ctx.moveTo(tx, 0.46);
      ctx.lineTo(tx, 0.72);
    }
    ctx.lineWidth = 0.028;
    ctx.stroke();
  });

  withGlow(
    () => {
      ctx.beginPath();
      ctx.moveTo(-0.44, 0.08);
      ctx.quadraticCurveTo(-0.28, 0.22, -0.36, 0.38);
      ctx.moveTo(0.44, 0.08);
      ctx.quadraticCurveTo(0.28, 0.22, 0.36, 0.38);
      ctx.lineWidth = 0.03;
      ctx.stroke();
    },
    COLOR_MID,
    6,
  );

  ctx.restore();
}
