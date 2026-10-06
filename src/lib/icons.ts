// 9×9 pixel icons for the filters. "X" is solid, "o" is a lighter tone (glass, liquid, pill half),
// "." is empty. Drawn in currentColor so each icon takes its type color.
export const ICONS = {
  all: [
    "XXXX.XXXX",
    "XXXX.XXXX",
    "XXXX.XXXX",
    "XXXX.XXXX",
    ".........",
    "XXXX.XXXX",
    "XXXX.XXXX",
    "XXXX.XXXX",
    "XXXX.XXXX",
  ],
  // capsule
  pharmacology: [
    ".........",
    ".........",
    "..XXooo..",
    ".XXXoooo.",
    ".XXXoooo.",
    ".XXXoooo.",
    "..XXooo..",
    ".........",
    ".........",
  ],
  // heart
  conditions: [
    ".........",
    ".XX...XX.",
    "XXXX.XXXX",
    "XXXXXXXXX",
    "XXXXXXXXX",
    ".XXXXXXX.",
    "..XXXXX..",
    "...XXX...",
    "....X....",
  ],
  // flask
  labs: [
    "...XXX...",
    "...X.X...",
    "...X.X...",
    "..X...X..",
    "..X...X..",
    ".XoooooX.",
    "XoooooooX",
    "XoooooooX",
    "XXXXXXXXX",
  ],
  // clipboard
  fundamentals: [
    "...XXX...",
    ".XXXoXXX.",
    ".X.....X.",
    ".X.XXX.X.",
    ".X.....X.",
    ".X.XXX.X.",
    ".X.....X.",
    ".X.XX..X.",
    ".XXXXXXX.",
  ],
  // "AB"
  abbreviations: [
    ".........",
    ".X..XXX..",
    "X.X.X..X.",
    "X.X.XXX..",
    "XXX.X..X.",
    "X.X.X..X.",
    "X.X.XXX..",
    ".........",
    ".........",
  ],
  // baby bottle
  obstetrics: [
    "....X....",
    "...XXX...",
    "...XXX...",
    "..XXXXX..",
    "..XoooX..",
    "..XoooX..",
    "..XoooX..",
    "..XoooX..",
    "..XXXXX..",
  ],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof ICONS;
