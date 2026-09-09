import HawlakExplorer from "../components/hawlak-explorer";
import { getPlaces } from "../lib/places";

export default function Home() {
  return <HawlakExplorer places={getPlaces()}/>;
}
