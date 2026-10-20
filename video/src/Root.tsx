import { Composition } from "remotion";
import { TOTAL, Trailer } from "./Trailer";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Trailer"
    component={Trailer}
    durationInFrames={TOTAL}
    fps={30}
    width={1920}
    height={1080}
  />
);
