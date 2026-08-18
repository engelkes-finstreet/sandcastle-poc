import { appPreset } from "@/styles";
import { ecoPreset } from "@finstreet/ui/theme";
import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  jsxFramework: "react",
  importMap: "@styled-system",
  preflight: true,
  include: [
    "./node_modules/@finstreet/ui/dist/panda.buildinfo.json",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  outdir: "styled-system",
  presets: ["@pandacss/preset-panda", ecoPreset, appPreset],
});
