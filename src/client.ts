import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import Debug from "debug";
import { hasProperties, isObject } from "./utils/exists";
import { Either, ErrorResponse, SuccessResponse } from "./utils/either";

/* run via npm test DEBUG=jsonrpc-ts-client etc */
const debug = Debug("jsonrpc-ts-client");

type ErrorData =
  | {
      required: string[];
    }
  | string; // message

export interface JsonRpcError {
  code: number;
  message: string;
  data?: ErrorData;
}

export const isJsonRpcError = (v: object): v is JsonRpcError => {
  return hasProperties(v, "code", "message");
};

interface BaseJsonRpcResponse {
  jsonrpc: "2.0";
  id?: string;
}

export interface JsonRpcResponseSuccess<Data> extends BaseJsonRpcResponse {
  result: Data;
}

export interface JsonRpcResponseError extends BaseJsonRpcResponse {
  error: JsonRpcError;
}

export const isJsonRpcResponseError = <T>(
  value: JsonRpcResponse<T>
): value is JsonRpcResponseError => {
  return "error" in value && value.error !== null;
};

type JsonRpcResponse<T> = JsonRpcResponseSuccess<T> | JsonRpcResponseError;

export class InvalidJsonRpcResponseError extends Error {
  type = "INVALID_JSONRPC_RESPONSE";
  constructor(message: string) {
    super(
      `Your server spec must conform to: https://www.jsonrpc.org/specification. ${message}`
    );
  }
}
/**
 * Validate the basic structure of the JSON:RPC reply
 */
function assertJsonRpcReply<T>(v: unknown): asserts v is JsonRpcResponse<T> {
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

type Parameters = Record<string, any>;

export class JsonRpcCall<Params extends Parameters> {
  public jsonrpc = "2.0";
  constructor(
    public method: string,
    public params: Params,
    public id?: string
  ) {}
}

interface ApiClientCreateConfigOptions {
  baseUrl: string;
  url?: string;
  headers?: Record<string, string>;
  idGeneratorFn?: () => string;
}

export class ApiClientConfig {
  baseUrl: string;
  url: string;
  headers?: Record<string, string>;
  idGeneratorFn?: () => string;

  /**
   * Asserts that the current object is valid; this is useful in non-typescript environments.
   */
  public validate() {
    if (this.baseUrl && this.url && typeof this.idGeneratorFn === "function") {
      return;
    } else {
      throw new Error("Invariant Error: Invalid Configuration!");
    }
  }

  /**
   * Allows the user to do ad-hock updates to the configration.
   * Merge a set of arbitrary overrides with the current configuration, and validate.
   */
  public merge(o: Partial<ApiClientCreateConfigOptions>) {
    o.baseUrl && (this.baseUrl = o.baseUrl);
    o.url && (this.url = o.url);
    o.idGeneratorFn && (this.idGeneratorFn = o.idGeneratorFn);
    o.headers && (o.headers = this.headers);
    this.validate();
  }

  constructor(options: ApiClientCreateConfigOptions) {
    this.baseUrl = options.baseUrl;
    this.url = options.url || "/";
    this.headers = options.headers;
    this.idGeneratorFn = options.idGeneratorFn;
  }
}

export class JsonRpcClient {
  #client: AxiosInstance;
  config: ApiClientConfig;

  constructor(options: ApiClientCreateConfigOptions) {
    this.config = new ApiClientConfig(options);
    this.#client = this.buildAxiosClient(this.config);
  }

  /**
   * Create and return a new axios client
   */
  buildAxiosClient(config: ApiClientConfig) {
    return axios.create({
      baseURL: config.baseUrl,
      url: config.url || "/",
      headers: config.headers,
      validateStatus: (_status) => true, // never throw errors in response to status codes
    });
  }

  private jsonRpcResponseToEither<T extends object>(
    axiosData: JsonRpcResponse<T>
  ): Either<JsonRpcError, T> {
    if (isJsonRpcResponseError(axiosData)) {
      return new ErrorResponse(axiosData.error);
    } else {
      return new SuccessResponse(axiosData.result);
    }
  }

  exec = async <Result extends object>(
    method: string,
    params: Parameters,
    id?: string,
    configOverrides?: Partial<ApiClientCreateConfigOptions>
  ): Promise<Either<JsonRpcError, Result>> => {
    try {
      if (configOverrides) {
        this.config.merge(configOverrides);
        this.#client = this.buildAxiosClient(this.config);
      }
      const data = new JsonRpcCall(
        method,
        params,
        id || this.config.idGeneratorFn?.()
      );
      const axiosResponse: AxiosResponse<unknown> | AxiosError =
        await this.#client({
          method: "post",
          data,
        });
      const axiosData = axiosResponse.data;
      assertJsonRpcReply<Result>(axiosData);
      debug(axiosResponse);

      const response = this.jsonRpcResponseToEither(axiosData);
      return response;
    } catch (err: any) {
      debug(err);
      throw err;
    }
  };
}
