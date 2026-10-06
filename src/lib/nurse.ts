// The NurseDex mascot: a 16×16 pixel nurse. Each letter is a color in PALETTE, "." is transparent.
// The cap cross is blue on purpose: a red cross on white is a protected emblem.
export const NURSE_GRID = [
  "....WWWWWWWW....",
  "...WWWWBBWWWW...",
  "...WWWBBBBWWW...",
  "...WWWWBBWWWW...",
  "..HHHHHHHHHHHH..",
  ".HHHSSSSSSSSHHH.",
  ".HHSWKSSSSWKSHH.",
  ".HHSSSSSSSSSSHH.",
  ".HHMMMMMMMMMMHH.",
  ".HHMLLLLLLLLMHH.",
  "..HMMMMMMMMMMH..",
  "......SSSS......",
  "..NNNNWSSWNNNN..",
  ".NNNNNNWWNNNNNN.",
  ".NNCNNNNNNNNCNN.",
  ".NNNNNNNNNNNNNN.",
];

export const NURSE_PALETTE: Record<string, string> = {
  W: "#FFFFFF", // cap, eye highlight, collar
  B: "#3D6FA8", // cap cross (scrubs blue)
  H: "#3B2A20", // hair
  S: "#C68B59", // skin
  K: "#1E3A5F", // eyes (navy)
  M: "#A8D8EA", // surgical mask
  L: "#8FA9D6", // mask pleat (ceil)
  N: "#3D6FA8", // scrubs
  C: "#8FA9D6", // pockets
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
