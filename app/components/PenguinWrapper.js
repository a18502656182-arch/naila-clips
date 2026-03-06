"use client";
import dynamic from "next/dynamic";

const PenguinMascot = dynamic(() => import("./PenguinMascot"), { ssr: false });

export default function PenguinWrapper() {
  return <PenguinMascot />;
}
