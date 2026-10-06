// The NurseDex mascot: a 24×24 pixel nurse. Each letter is a color in NURSE_PALETTE, "." is transparent.
// No facial features, on purpose. The cap cross is blue: a red cross on white is a protected emblem.
export const NURSE_SIZE = 24;

export const NURSE_GRID = [
  "........WWWWWWWW........",
  ".......AAAABBAAAA.......",
  ".......AAABBBBAAA.......",
  ".......AAAABBAAAA.......",
  "......cccccccccccc......",
  ".....HHHHHHHHHHHHHH.....",
  "....HHHHHHHHHHHHHHHH....",
  "....HHHHHHHSSSSSHHHH....",
  "....HHHHSSSSSSSSHHHH....",
  "....HHHHSSSSSSSSHHHH....",
  "....HHHHsSSSSSSsHHHH....",
  "....HHHHsSSSSSSsHHHH....",
  "....HHHHHSSSSSSHHHHH....",
  ".....HHHHHssssHHHHH.....",
  "........GGSSSSGG........",
  ".....NNNGNSSSSNGNNN.....",
  "...nNNNNGNNSSNNGNNNNn...",
  "...nNNNNGNNnnNNgNNNNn...",
  "...nNNNNGNNNNNNNNNNNn...",
  "...nNNNggNNNNNNWWWNNn...",
  "...nNNgGGgNNNNNLLLNNn...",
  "...nNNNggNNNNNNWWWNNn...",
  "...nNNNNNNNNNNNNNNNNn...",
  "...nNNNNNNNNNNNNNNNNn...",
];

export const NURSE_PALETTE: Record<string, string> = {
  W: "#FFFFFF", // cap top, collar, badge
  A: "#A8D8EA", // cap (surgical-mask blue)
  c: "#8FA9D6", // cap band (ceil)
  B: "#3D6FA8", // cap cross (scrubs blue)
  H: "#3B2A20", // hair
  S: "#EDBE9A", // skin
  s: "#D9A27E", // skin shadow
  N: "#3D6FA8", // scrubs
  n: "#2F5A8C", // scrubs shadow
  G: "#9AA6B6", // stethoscope
  g: "#5F6B7D", // stethoscope dark
  L: "#8FA9D6", // badge stripe (ceil)
};

// Merges horizontal runs of the same color into one rect each (fewer SVG nodes).
export function nurseRects(): { x: number; y: number; w: number; fill: string }[] {
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  NURSE_GRID.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (row[x + w] === c) w++;
      if (c !== ".") rects.push({ x, y, w, fill: NURSE_PALETTE[c] });
      x += w;
    }
  });
  return rects;
}
