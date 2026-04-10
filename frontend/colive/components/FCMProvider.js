"use client";

import useFCM from "../lib/useFCM";

// Thin wrapper so useFCM (a client hook) can be
// called from the server-side RootLayout via a
// "use client" boundary component.
export default function FCMProvider() {
  useFCM();
  return null;
}
