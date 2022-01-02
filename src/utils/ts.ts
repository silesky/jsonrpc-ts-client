import { Either } from "./either";
import { JsonRpcError } from "./jsonrpc";

export type GetElementByIndex<T, Index> = Index extends keyof T
  ? T[Index]
  : never;

/**
 * MapEither<[Foo, Bar]> -> [Either<JsonRpcError, Foo>, Either<JsonRpcError, Bar>]
 */
export type MapEither<T extends [...any[]]> = {
  [Index in keyof T]: Either<JsonRpcError, GetElementByIndex<T, Index>>;
} & {};

export type InterfaceToType<T> = { [P in keyof T]: T[P] } & {};
