"use client";

import { setSoundOn, useSoundOn } from "@/lib/sound";
import PixelIcon from "./PixelIcon";

export default function SoundToggle() {
  const on = useSoundOn();
  return (
    <button
      onClick={() => setSoundOn(!on)}
      aria-pressed={on}
      aria-label={on ? "Sonido activado / Sound on" : "Sonido desactivado / Sound off"}
      title={on ? "Sonido: sí" : "Sonido: no"}
      className="grid h-9 w-9 place-items-center rounded text-mask hover:bg-white/10"
    >
      <PixelIcon name={on ? "soundOn" : "soundOff"} size={18} />
    </button>
  );
}
