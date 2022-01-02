import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import Debug from "debug";
import {
  assertJsonRpcReply,
  assertJsonRpcReplyBatch,
  JsonRpcCall,
  JsonRpcError,
  JsonRpcParams,
  jsonRpcResponseToEither,
} from "./utils/jsonrpc";
import { Either } from "./utils/either";
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

type GetParamsFromContract<
  Api extends JsonRpcApi,
  Method extends keyof Api
> = Parameters<Api[Method]>[0];

type GetResponseFromContract<
  Api extends JsonRpcApi,
  Method extends keyof Api
> = ReturnType<Api[Method]>;

type GetAllCalls<Api extends JsonRpcApi> = {
  [Method in keyof Api]: Call<Api, Method>;
}[keyof Api];

type Call<Api extends JsonRpcApi, Method extends keyof Api> = {
  method: Method;
  params?: GetParamsFromContract<Api, Method>;
  id?: string;
};

type GetAllResponses<
  Api extends JsonRpcApi,
  Calls extends readonly Call<any, any>[]
> = {
  [Index in keyof Calls]: Either<
    JsonRpcError,
    ReturnType<
      GetElementByIndex<Api, GetElementByIndex<Calls[Index], "method">>
    >
  >;
};

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

  async exec<M extends keyof Api = any>(
    method: M,
    params: GetParamsFromContract<Api, M>,
    id?: string,
    configOverrides?: Partial<JsonRpcCreateConfig>
  ): Promise<Either<JsonRpcError, GetResponseFromContract<Api, M>>>;

  async exec<Response>(
    method: Api extends EmptyObject ? string : never, // maybe add a branded type??
    params?: JsonRpcParams,
    id?: string,
    configOverrides?: Partial<JsonRpcCreateConfig>
  ): Promise<Either<JsonRpcError, Response>>;

  /**
  /**
   * Execute a single JSON-RPC request.
   * @link https://www.jsonrpc.org/specification#request_object
   *
   * @param method - JSON-RPC Method (e.g 'getUser')
   * @param params - Data that will be sent in the request body to the JSON-RPC endpoint
   * @param id - Request ID
   * @param configOverrides - Override the base client configurations
   */
  async exec(
    method: string,
    params: JsonRpcParams,
    id?: string,
    configOverrides?: Partial<JsonRpcCreateConfig>
  ) {
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
      assertJsonRpcReply<any>(axiosData);

      debug(axiosResponse);

      const response = jsonRpcResponseToEither(axiosData);
      return response;
    } catch (err) {
      debug(err);
      throw err;
    }
  }

  /**
   * Execute a batch JSON-RPC request.
   * @link https://www.jsonrpc.org/specification#batch
   *
   * @param calls - an array of calls
   * @example execBatch([{ method: 'getFoo', params: {fooId: 123}}, { method: 'getBar'}])
   */
  async execBatch<Calls extends readonly GetAllCalls<Api>[]>(
    calls: Calls
  ): Promise<GetAllResponses<Api, Calls>>;

  async execBatch<Result extends unknown[]>(
    calls: Call<JsonRpcApi, string>[]
  ): Promise<MapEither<Result>>;

  async execBatch(calls: Call<any, any>[]): Promise<unknown[]> {
    try {
      const data = calls.map(
        (el) =>
          new JsonRpcCall(
            el.method,
            el.params as JsonRpcParams,
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

      const response = axiosData.map(jsonRpcResponseToEither);
      return response;
    } catch (err) {
      debug(err);
      throw err;
    }
  }
}
