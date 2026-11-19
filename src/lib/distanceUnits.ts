export const KM_PER_MILE = 1.609344;

export const kmToMiles = (km: number) => km / KM_PER_MILE;
export const milesToKm = (miles: number) => miles * KM_PER_MILE;
export const displayedMiles = (km: number) => Math.round(kmToMiles(km));

/** The existing radius column stores whole kilometres. */
export const storedRadiusKm = (miles: number, maxKm: number) =>
  Math.min(maxKm, Math.round(milesToKm(miles)));

export const distanceMilesLabel = (km: number) => {
  const miles = kmToMiles(km);
  return `${miles < 10 ? Math.max(0.1, miles).toFixed(1) : Math.round(miles)} mi away`;
};