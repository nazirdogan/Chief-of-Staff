import { continueRender, delayRender, staticFile } from "remotion";

const fontHandle = delayRender("Loading Cormorant Garamond");

Promise.resolve().then(async () => {
  if (typeof document === "undefined") {
    continueRender(fontHandle);
    return;
  }
  const regular = new FontFace(
    "Cormorant Garamond",
    `url(${staticFile("fonts/CormorantGaramond-VariableFont_wght.ttf")})`
  );
  const italic = new FontFace(
    "Cormorant Garamond",
    `url(${staticFile("fonts/CormorantGaramond-Italic-VariableFont_wght.ttf")})`,
    { style: "italic" }
  );
  document.fonts.add(regular);
  document.fonts.add(italic);
  await Promise.all([regular.load(), italic.load()]);
  continueRender(fontHandle);
});
