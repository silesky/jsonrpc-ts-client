import { hasProperties, isObject } from "./exists";

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export const isJsonRpcError = (v: object): v is JsonRpcError => {
  return hasProperties(v, "code", "message");
};

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
      `Invalid response ${JSON.stringify(v, undefined, 2)}`
    );
  }
  if (hasProperties(v, "result", "error")) {
    if (v.result && v.error) {
      throw new InvalidJsonRpcResponseError(
        "Result and error member should not exist together (https://www.jsonrpc.org/specification#5)"
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
