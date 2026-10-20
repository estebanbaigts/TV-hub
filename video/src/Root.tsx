import { Composition } from "remotion";
import { TOTAL, Trailer } from "./Trailer";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Trailer"
      component={Trailer}
      defaultProps={{ lang: "en" as const }}
      durationInFrames={TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="TrailerFR"
      component={Trailer}
      defaultProps={{ lang: "fr" as const }}
      durationInFrames={TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
