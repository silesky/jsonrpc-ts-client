import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import Debug from "debug";
import {
  assertJsonRpcReply,
  assertJsonRpcReplyBatch,
  isJsonRpcResponseError,
  JsonRpcCall,
  JsonRpcError,
  JsonRpcParams,
  JsonRpcResponse,
} from "./utils/jsonrpc";
import { Either, ErrorResponse, SuccessResponse } from "./utils/either";
import { GetElementByIndex, MapEither } from "./utils/ts";

/* run via npm test DEBUG=jsonrpc-ts-client etc */
const debug = Debug("jsonrpc-ts-client");

export interface JsonRpcCreateConfig {
  url: string;
  headers?: Record<string, string>;
  idGeneratorFn?: () => string;
}

export class ApiClientConfig {
  url: string;
  headers?: Record<string, string>;

  idGeneratorFn?: () => string;

  /**
   * Asserts that the current object is valid; this is useful in non-typescript environments.
   */
  public validate() {
    if (!this.url) {
      throw new Error("no url set.");
    }
    return;
  }

  /**
   * Allows the user to do ad-hock updates to the configration.
   * Merge a set of arbitrary overrides with the current configuration, and validate.
   */
  public merge(o: Partial<JsonRpcCreateConfig>) {
    o.url && (this.url = o.url);
    o.idGeneratorFn && (this.idGeneratorFn = o.idGeneratorFn);
    o.headers && (o.headers = this.headers);
    this.validate();
  }

  constructor(opts: JsonRpcCreateConfig) {
    this.url = opts.url;
    this.headers = opts.headers;
    this.idGeneratorFn = opts.idGeneratorFn;
  }
}

export interface JsonRpcClientCallOptions {
  method: string;
  params: JsonRpcParams;
  id?: string;
}

type JsonRpcApi = {
  [methodName: string]: (params: any) => any;
};

type EmptyObject = Record<string, never>;

type KeyofOrDefault<T> = T extends EmptyObject ? string : keyof T;

/**
 * Instantiate this class to make requests to a JSON-RPC endpoint (or endpoints).
 */

export class JsonRpcClient<Api extends JsonRpcApi = EmptyObject> {
  #client: AxiosInstance;
  config: ApiClientConfig;

  constructor(opts: JsonRpcCreateConfig) {
    this.config = new ApiClientConfig(opts);
    this.#client = this.#buildAxiosClient(this.config);
  }

  /**
   * Create a new axios client.
   */
  #buildAxiosClient(config: ApiClientConfig) {
    return axios.create({
      baseURL: config.url,
      headers: config.headers,
      validateStatus: () => true, // never throw errors in response to status codes
    });
  }

  #jsonRpcResponseToEither<T>(
    axiosData: JsonRpcResponse<T>
  ): Either<JsonRpcError, T> {
    return isJsonRpcResponseError(axiosData)
      ? new ErrorResponse(axiosData.error)
      : new SuccessResponse(axiosData.result);
  }

  /**
   * Execute a JSON-RPC Method call.
   * @param method - JSON-RPC Method (e.g 'getUser')
   * @param params - Data that will be sent in the request body to the JSON-RPC endpoint
   * @param id - Request ID
   * @param configOverrides - Override the base client configurations
   */
  async exec<ApiResponse, M extends KeyofOrDefault<Api> = any>(
    method: M,
    params: Api extends EmptyObject
      ? JsonRpcParams
      : Parameters<GetElementByIndex<Api, M>>[0],
    id?: string,
    configOverrides?: Partial<JsonRpcCreateConfig>
  ): Promise<
    Either<
      JsonRpcError,
      Api extends EmptyObject
        ? ApiResponse
        : ReturnType<GetElementByIndex<Api, M>>
    >
  > {
    try {
      if (configOverrides) {
        this.config.merge(configOverrides);
        this.#client = this.#buildAxiosClient(this.config);
      }

      const data = new JsonRpcCall(
        method as string,
        params,
        id || this.config.idGeneratorFn?.()
      );

      const axiosResponse: AxiosResponse<unknown> | AxiosError =
        await this.#client({
          method: "post",
          data,
        });

      const axiosData = axiosResponse.data;
      assertJsonRpcReply<ApiResponse>(axiosData);

      debug(axiosResponse);

      // typing this is _hard_ with conditional types, and not especially useful here.
      const response = this.#jsonRpcResponseToEither(axiosData) as any;
      return response;
    } catch (err) {
      debug(err);
      throw err;
    }
  }

  async execBatch<Result extends [...unknown[]]>(
    calls: JsonRpcClientCallOptions[]
  ) {
    try {
      const data = calls.map(
        (el) =>
          new JsonRpcCall(
            el.method,
            el.params,
            el.id || this.config.idGeneratorFn?.()
          )
      );

      const axiosResponse: AxiosResponse<unknown> | AxiosError =
        await this.#client({
          method: "post",
          data,
        });

      const axiosData = axiosResponse.data;
      assertJsonRpcReplyBatch(axiosData);

      debug(axiosResponse);

      const response = axiosData.map(
        this.#jsonRpcResponseToEither
      ) as MapEither<Result>;
      return response;
    } catch (err) {
      debug(err);
      throw err;
    }
  }
}
