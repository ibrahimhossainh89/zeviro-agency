// "Request price" mode: when Settings → Orders & payments → "Show package prices" is off,
// prices are removed before content leaves the server, and every order starts as a price request.
import { Setting } from '../models/index.js';

let cache = { at: 0, value: false };
export async function pricesVisible() {
  if (Date.now() - cache.at < 5000) return cache.value;
  const s = await Setting.findOne({ key: 'site' }).select('payments.showPrices').lean();
  cache = { at: Date.now(), value: !!s?.payments?.showPrices };
  return cache.value;
}
export const resetPriceCache = () => { cache.at = 0; };

/** Strip prices from a lean content document (service or gig). */
export function hidePrices(doc) {
  if (!doc) return doc;
  const d = { ...doc };
  if (Array.isArray(d.packages)) d.packages = d.packages.map((p) => ({ ...p, price: 0 }));
  delete d.hourlyRate;
  delete d.startingPrice;
  return d;
}
