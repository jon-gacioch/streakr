import { geocode } from "@/lib/services/geocode";
import { searchPlaces } from "@/lib/services/places";
import { getRoute } from "@/lib/services/routing";
import { getElevation } from "@/lib/services/elevation";

export const toolExecutors: Record<
  string,
  (args: Record<string, unknown>) => Promise<unknown>
> = {
  geocode: (args) => geocode(args.query as string),
  search_places: (args) =>
    searchPlaces(
      args.lat as number,
      args.lng as number,
      args.radius_meters as number,
      args.categories as string[]
    ),
  get_route: (args) => getRoute(args.waypoints as [number, number][]),
  get_elevation: (args) =>
    getElevation(args.route_geometry as { coordinates: number[][] }),
};
