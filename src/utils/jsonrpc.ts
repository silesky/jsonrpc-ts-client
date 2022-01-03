import { hasProperties, isObject } from "./exists";

export interface JsonRpcError {
  jsonrpc: "2.0";
  code: number;
  message: string;
  id: null | string | number;
}

interface IJsonRpcResponse {
  jsonrpc: "2.0";
  id?: string;
}

export interface JsonRpcResponseSuccess<Data> extends IJsonRpcResponse {
  result: Data;
}

export interface JsonRpcResponseError extends IJsonRpcResponse {
  error: JsonRpcError;
}

export const isJsonRpcResponseError = <T>(
  value: JsonRpcResponse<T>
): value is JsonRpcResponseError => {
  return "error" in value && value.error !== null;
};

export type JsonRpcResponse<T> =
  | JsonRpcResponseSuccess<T>
  | JsonRpcResponseError;

export class InvalidJsonRpcResponseError extends Error {
  constructor(message: string) {
    super(
      `Your server spec must conform to: https://www.jsonrpc.org/specification. ${message}`
    );
  }
}
/**
 * Validate the basic structure of the JSON:RPC reply
 */
export function assertJsonRpcReply<T>(
  v: unknown
): asserts v is JsonRpcResponse<T> {
  if (!isObject(v)) {
    throw new InvalidJsonRpcResponseError(
      `Response is not object, got: ${JSON.stringify(v, undefined, 2)}`
    );
  }
  if (!hasProperties(v, "jsonrpc")) {
    throw new InvalidJsonRpcResponseError(
      `Response should contain "jsonrpc: "2.0""`
    );
  }
  if (!hasProperties(v, "id")) {
    throw new InvalidJsonRpcResponseError(
      `Response must have an ID property (even if that ID is null)`
    );
  }
  if (v.id === undefined) {
    throw new InvalidJsonRpcResponseError(
      "Response ID should be null rather than undefined"
    );
  }
  if (hasProperties(v, "result", "error")) {
    if (v.result && v.error) {
      throw new InvalidJsonRpcResponseError(
        "Result and error member should not exist together"
      );
    }
  }
  if (hasProperties(v, "error")) {
    if (!isObject(v.error)) {
      throw new InvalidJsonRpcResponseError('"error" field should be object');
    }
    if (!hasProperties(v.error, "code", "message")) {
      throw new InvalidJsonRpcResponseError(
        `invalid "error" field shape: ${JSON.stringify(v.error, undefined, 2)}`
      );
    }
  }
}

export function assertJsonRpcReplyBatch(
  v: unknown
): asserts v is JsonRpcResponse<any>[] {
  if (!Array.isArray(v)) {
    throw new InvalidJsonRpcResponseError("Batch response should be an array");
  }
  v.forEach(assertJsonRpcReply);
}

export type JsonRpcParams = Record<string, unknown>;

export class JsonRpcCall<Params extends JsonRpcParams> {
  public jsonrpc = "2.0";
  constructor(
    public method: string,
    public params?: Params,
    public id?: string
  ) {}
}

abstract class EitherApi {
  isError<Success>(
    this: JsonRpcEitherResponse<Success>
  ): this is ErrorResponse<Error> {
    return this.type === "error";
  }

  isSuccess<Success>(
    this: JsonRpcEitherResponse<Success>
  ): this is SuccessResponse<Success> {
    return !this.isError();
  }
}

type JsonRpcIdFromApi = string | number | null;
interface IJsonRpc {
  readonly id?: string | number;
}
/**
 * Class representing "right" (success case)
 */
export class SuccessResponse<T> extends EitherApi implements IJsonRpc {
  public readonly type = "success";
  public id?: IJsonRpc["id"];
  constructor(public result: T, id?: JsonRpcIdFromApi) {
    super();
    this.id = id ?? undefined;
  }
}

/**
 * Class representing "left" (failure case)
 */
export class ErrorResponse<T> extends EitherApi implements IJsonRpc {
  public readonly type = "error";
  public id?: IJsonRpc["id"];
  constructor(public error: T, id?: JsonRpcIdFromApi) {
    super();
    this.id = id ?? undefined;
  }
}

export type JsonRpcEitherResponse<T> =
  | SuccessResponse<T>
  | ErrorResponse<JsonRpcError>;

export const id = <T>(v: T): T => v;
export const jsonRpcResponseToEither = <T>(
  response: JsonRpcResponse<T>
): JsonRpcEitherResponse<T> => {
  return isJsonRpcResponseError(response)
    ? new ErrorResponse(response.error, response.id)
    : new SuccessResponse(response.result, response.id);
};
