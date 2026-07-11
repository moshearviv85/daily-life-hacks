/**
 * Derive routing artifacts from pipeline-data/pin-destinations.json
 *
 *   node scripts/derive-pin-routing.mjs
 */
import { derivePinRoutingFromFile } from "./lib/derive-pin-routing.mjs";

const counts = derivePinRoutingFromFile();
console.log("[derive-pin-routing]", counts);
