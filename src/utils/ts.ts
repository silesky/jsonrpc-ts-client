import { JsonRpcEitherResponse } from "./jsonrpc";

export type GetElementByIndex<T, Index> = Index extends keyof T
  ? T[Index]
  : never;

/**
 * MapJsonRpcYeah<[Foo, Bar]> -> [JsonRpcYeah<Foo>, JsonRpcYeah<Bar>]
 */
export type MapBatchResult<T extends [...any[]]> = {
  [Index in keyof T]: JsonRpcEitherResponse<GetElementByIndex<T, Index>>;
} & {};

export type InterfaceToType<T> = { [P in keyof T]: T[P] } & {};
