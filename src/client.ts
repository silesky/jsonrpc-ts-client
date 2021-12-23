import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { hasProperties, isObject } from './utils'
import { Either, ErrorResponse, SuccessResponse } from './utils/either';

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
  return hasProperties(v, 'code', 'message');
};

interface BaseJsonRpcResponse {
  jsonrpc: '2.0';
  id: string;
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
  return 'error' in value && value.error !== null;
};

type JsonRpcResponse<T> = JsonRpcResponseSuccess<T> | JsonRpcResponseError;

/**
 * Validate the basic structure of the JSON:RPC reply
 */
function assertJsonRpcReply<T>(v: unknown): asserts v is JsonRpcResponse<T> {
  if (!isObject(v)) {
    throw new Error('Response is not object');
  }
  if (!hasProperties(v, 'jsonrpc')) {
    throw new Error(`Invalid response ${JSON.stringify(v, undefined, 2)}`);
  }
  if (hasProperties(v, 'result', 'error')) {
    if (v.result && v.error) {
      throw new Error(
        'Result and error member should not exist together (https://www.jsonrpc.org/specification#5)'
      );
    }
  }
  if (hasProperties(v, 'error')) {
    if (!isObject(v.error)) {
      throw new Error('Error not object');
    }
    if (!hasProperties(v.error, 'code', 'message')) {
      throw new Error(
        `Invalid error shape: ${JSON.stringify(v.error, undefined, 2)}`
      );
    }
  }
}

type Parameters = Record<string, any>;

export class JsonRpcCall<Params extends Parameters> {
  public jsonrpc = '2.0';
  constructor(
    public method: string,
    public params: Params,
    public id = uuidv4()
  ) {}
}

export class {
  #client: AxiosInstance;
  constructor(apiKey: string, baseUrl: string) {
    this.#client = axios.create({
      baseURL: baseUrl,
      url: '/',
      headers: {
        'API-Key': apiKey,
      },
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

  /**s
   * auto snake cases params
   * auto camel cases result
   */
  exec = async <Result extends object>(
    method: string,
    params: Parameters
  ): Promise<Either<JsonRpcError, Result>> => {
    try {
      const data = new JsonRpcCall(method, params);
      const axiosResponse: AxiosResponse<unknown> = await this.#client({
        method: 'post',
        data,
      });
      const axiosData = axiosResponse.data;
      assertJsonRpcReply<any>(axiosData);

      const response = this.jsonRpcResponseToEither<Result>(axiosData);
      return response;
    } catch (err: any) {
      // this should never happen
      return new ErrorResponse({
        code: err.code || 666,
        message: err.message || 'some unhandled axios error happened.',
        ...(err.data ? { data: err.data } : {}),
      });
    }
  };
}
