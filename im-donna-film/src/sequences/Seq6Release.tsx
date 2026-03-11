import React from "react";
import { useCurrentFrame } from "remotion";
import { Word } from "../components/Word";
import { IVORY } from "../constants";

// Seq 6: frames 786–968  (0:32.75–0:40.3)
// "You don't need to carry all of it any more."
// beat 1.0s
// "That's what I'm here for."
// beat 1.5s → "I'm Donna." (handled by DonnaHeader close + Seq7)

export const Seq6Release: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 786 || frame > 920) return null;

  return (
    <>
      {/* "You don't need to carry" — line 1 at Y:510 */}
      <Word text="You"   x={700}  y={510} appearFrame={788}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="don't" x={800}  y={510} appearFrame={791}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="need"  x={898}  y={510} appearFrame={794}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="to"    x={981}  y={510} appearFrame={797}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="carry" x={1055} y={510} appearFrame={800}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />

      {/* "all of it any more." — line 2 at Y:565 */}
      <Word text="all"   x={820}  y={565} appearFrame={803}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="of"    x={893}  y={565} appearFrame={806}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="it"    x={952}  y={565} appearFrame={809}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="any"   x={1026} y={565} appearFrame={812}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />
      <Word text="more." x={1115} y={565} appearFrame={815}  fadeOutFrame={845} fadeOutDur={10} fontSize={48} color={IVORY} />

      {/* "That's what I'm here for." — appears after 1.0s beat */}
      <Word text="That's" x={820}  y={530} appearFrame={870} fadeOutFrame={910} fadeOutDur={19} fontSize={52} color={IVORY} />
      <Word text="what"   x={918}  y={530} appearFrame={874} fadeOutFrame={910} fadeOutDur={19} fontSize={52} color={IVORY} />
      <Word text="I'm"    x={996}  y={530} appearFrame={878} fadeOutFrame={910} fadeOutDur={19} fontSize={52} color={IVORY} />
      <Word text="here"   x={1065} y={530} appearFrame={882} fadeOutFrame={910} fadeOutDur={19} fontSize={52} color={IVORY} />
      <Word text="for."   x={1140} y={530} appearFrame={886} fadeOutFrame={910} fadeOutDur={19} fontSize={52} color={IVORY} />
    </>
  );
};
