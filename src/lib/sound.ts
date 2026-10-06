"use client";

import { useSyncExternalStore } from "react";

// An original "healing" chiptune for the logo: a rising major arpeggio on a square wave with a
// triangle-wave sparkle on top. It's generated with the Web Audio API (no audio file), and it's
// deliberately NOT the Pokémon Center melody, which is copyrighted.

const KEY = "sound";
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => true,
  );
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  listeners.forEach((l) => l());
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, volume: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.setValueAtTime(volume, start + dur * 0.7);
  gain.gain.linearRampToValueAtTime(0, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// Plays once per visit, where a visit is a page load (new tab, reopening the site or a refresh).
// The logo is also the way back home and gets tapped a lot, so after the first time it stays
// silent while she moves around the site. Kept in memory on purpose: sessionStorage gets copied
// into tabs opened from another tab, which made new tabs silent.
let played = false;

function alreadyPlayed(): boolean {
  if (played) return true;
  played = true;
  return false;
}

// Must be called from a click/tap: browsers only allow sound after a user gesture.
export function playHeal() {
  if (!read() || alreadyPlayed()) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = (ctx ??= new AC());
    const play = () => {
      const t = c.currentTime + 0.03;
      // G5 → C6 → E6 → G6 → C7, then a held E7 sparkle
      const notes = [784, 1046.5, 1318.5, 1568, 2093];
      notes.forEach((f, i) => tone(c, f, t + i * 0.075, 0.08, "square", 0.05));
      tone(c, 2637, t + notes.length * 0.075, 0.32, "triangle", 0.08);
      tone(c, 1318.5, t + notes.length * 0.075, 0.32, "square", 0.025);
    };
    // iPhones start the audio "suspended"; wait until it's running so the first notes aren't lost.
    if (c.state === "running") play();
    else void c.resume().then(play, () => {});
  } catch {
    // no audio support: stay silent
  }
}
