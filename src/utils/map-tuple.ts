export function mapTuple<
  Tuple extends readonly [...any[]],
  MapFn extends (arg: Tuple[number]) => U,
  U
>(tuple: Tuple, mapFn: MapFn) {
  return tuple.map(mapFn) as unknown as MapTuple<Tuple, U>;
}

// type R = MapTuple<[1, 2, 3], number>; // [number, number, number]
export type MapTuple<T extends readonly [...any[]], NewType> = {
  [Index in keyof T]: NewType;
} & {};
