import HawlakExplorer from "../components/hawlak-explorer";
import { getPlaces } from "../lib/places";
import { withLiveSignals } from "../lib/live-places";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await withLiveSignals(getPlaces(), { includeStars: false });
  return <HawlakExplorer places={places}/>;
}
