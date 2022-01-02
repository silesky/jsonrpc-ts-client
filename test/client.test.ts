/* eslint-disable @typescript-eslint/no-explicit-any */

import { JsonRpcClient } from "../src";
import { JSONRPC_URL, mockResponse, waitForRequest } from "./server";
import * as uuid from "uuid";
import * as fixtures from "./fixtures";
import { JsonRpcApiContract } from "../src/client";

let client!: JsonRpcClient;
beforeEach(() => {
  client = new JsonRpcClient({
    idGeneratorFn: uuid.v4,
    url: JSONRPC_URL,
  });
});

describe("contracts", () => {
  type MyApiContract = {
    getFoo: (params: {
      fooId: number;
    }) => typeof fixtures.batchWithSuccess.payload1;
    getBar: () => typeof fixtures.batchWithSuccess.payload2;
    getFooBar: (params: {
      name: string;
    }) => typeof fixtures.batchWithSuccess.payload1;
  };

  const clientContract = new JsonRpcClient<MyApiContract>({
    idGeneratorFn: uuid.v4,
    url: JSONRPC_URL,
  });

  /* skip intentionally - dtslint is a better tool. */
  test.skip("[Typings]: batch", () => {
    // should work with interface if
    interface IContract extends JsonRpcApiContract {
      hello: () => { name: string };
    }

    new JsonRpcClient<IContract>({
      idGeneratorFn: uuid.v4,
      url: JSONRPC_URL,
    });

    // should be no error
    clientContract.exec("getBar"); // should not have params

    /** dtslint example */
    // @ts-expect-error
    clientContract.exec("getFoo"); // no params -- should have params

    // @ts-expect-error
    clientContract.exec("blah"); // does not exist

    // @ts-expect-error
    clientContract.exec("getBar", { fooId: 123 }); // wrong params

    // @ts-expect-error
    clientContract.exec("getFoo", { dont_exist: 123 }); // wrong params

    /** dtslint example */

    // @ts-expect-error
    clientContract.execBatch([
      { method: "getBar", params: { name: "foo" } },
    ] as const);

    // @ts-expect-error
    clientContract.execBatch([
      { method: "getBar", params: { name: "foo" } },
      { method: "getFoo", params: { name: "foo" } }, // should use the write param
    ] as const);

    // @ts-expect-error
    clientContract.execBatch([
      { method: "getFoo", params: { name: "foo" } }, // should be undefined
    ] as const);

    // no error
    clientContract.execBatch([
      { method: "getFoo" }, // should be undefined
    ]);
  });

  it("handles contracts", async () => {
    expect.assertions(1);
    mockResponse(fixtures.withSuccess.response);

    const response = await clientContract.exec("getFoo", { fooId: 123 });

    if (response.isSuccess()) {
      expect(response.result.name).toBe(fixtures.withSuccess.payload.name);
    }
  });

  it("handles batch", async () => {
    expect.assertions(2);
    mockResponse(fixtures.batchWithSuccess.response);

    const [r1, r2] = await clientContract.execBatch([
      { method: "getFoo", params: { fooId: 123 } },
      { method: "getBar" },
    ] as const);

    if (r1.isSuccess()) {
      expect(r1.result.name).toBe(fixtures.batchWithSuccess.payload1.name);
    }

    if (r2.isSuccess()) {
      expect(r2.result.some_data).toEqual(
        fixtures.batchWithSuccess.payload2.some_data
      );
    }
  });
});

it("handles valid jsonrpc success responses", async () => {
  expect.assertions(1);
  mockResponse(fixtures.withSuccess.response);
  const response = await client.exec<{ foo: number }>("my_method", {
    foo: 123,
  });
  if (response.isSuccess()) {
    response.result.foo; // should not error
    expect(response).toEqual({
      result: fixtures.withSuccess.payload,
      type: "success",
    });
  }
});

it("handles valid jsonrpc error responses", async () => {
  expect.assertions(1);
  mockResponse(fixtures.withError.response);
  const foo = await client.exec("my_not_found_method", {
    bars: 123,
  });
  if (foo.isError()) {
    expect(foo).toEqual({
      error: fixtures.withError.response.error,
      type: "error",
    });
  }
});

it("does not throw errors with jsonrpc error responses with 5xx status code", async () => {
  expect.assertions(1);
  mockResponse(fixtures.withError.response, { status: 500 });
  const foo = await client.exec("my_not_found_method", { foo: 123 });
  if (foo.isError()) {
    expect(foo).toEqual({
      error: fixtures.withError.response.error,
      type: "error",
    });
  }
});

it("does not throw errors with jsonrpc error responses with 4xx status code", async () => {
  expect.assertions(1);
  mockResponse(fixtures.withError.response, { status: 404 });
  const foo = await client.exec("my_not_found_method", { foo: 123 });
  if (foo.isError()) {
    expect(foo).toEqual({
      error: fixtures.withError.response.error,
      type: "error",
    });
  }
});

it("handles batch jsonrpc success responses", async () => {
  expect.assertions(2);
  mockResponse(fixtures.batchWithSuccess.response);
  const responses = await client.execBatch<
    [
      typeof fixtures.batchWithSuccess.payload1,
      typeof fixtures.batchWithSuccess.payload2
    ]
  >([
    { params: { foo: 123 }, method: "get_foo" },
    { params: { bar: 123 }, method: "get_bar" },
  ]);
  const [r1, r2] = responses;
  if (r1.isSuccess()) {
    expect(r1.result.name).toBe(fixtures.batchWithSuccess.payload1.name);
  }
  if (r2.isSuccess()) {
    expect(r2.result.some_data).toBe(
      fixtures.batchWithSuccess.payload2.some_data
    );
  }
});

it("throws errors in response to a network error or response that does not match the jsonrpc spec", async () => {
  expect.assertions(1);
  mockResponse({ foo: "bad-jsonrpc-response" }, { status: 400 });
  try {
    await client.exec("/foo/bar", { foo: 123 });
  } catch (err: any) {
    expect(err.message).toContain("www.jsonrpc.org/specification");
  }
});

it("throws errors in response to a 200 response that does not match the jsonrpc spec", async () => {
  expect.assertions(1);
  mockResponse({ foo: "bad-jsonrpc-response" }, { status: 200 });
  try {
    await client.exec<{ foo: number }>("/foo/bar", { foo: 123 });
  } catch (err: any) {
    expect(err.message).toContain("www.jsonrpc.org/specification");
  }
});

describe("configuration", () => {
  it("accepts an ID Generator function", async () => {
    client.config.idGeneratorFn = () => "my_id";
    mockResponse(fixtures.withSuccess.response);
    const pendingRequest = waitForRequest();
    const foo = await client.exec("my_method", { foo: 123 });
    const req = (await pendingRequest) as any;
    expect(req.body.id).toBe("my_id");
    expect(foo).toEqual({
      result: fixtures.withSuccess.payload,
      type: "success",
    });
  });
  it("will not pass an ID if no generator function nor arguments are passed in ", async () => {
    // expect.assertions(2);
    client = new JsonRpcClient({
      url: JSONRPC_URL,
      idGeneratorFn: undefined,
    });
    mockResponse(fixtures.withSuccess.response);
    const pendingRequest = waitForRequest();
    const foo = await client.exec("my_method", { foo: 123 });
    const req = (await pendingRequest) as any;
    expect("id" in req.body).toBeFalsy();
    expect(foo).toEqual({
      result: fixtures.withSuccess.payload,
      type: "success",
    });
  });
  it("will not send an ID if no id generator funtion is passed", async () => {
    mockResponse(fixtures.withSuccess.response);
    const foo = await client.exec("my_method", { foo: 123 });
    if (foo.isSuccess()) {
      expect(foo).toEqual({
        result: fixtures.withSuccess.payload,
        type: "success",
      });
    }
  });

  it("allows a user to pass an ID in exec", async () => {
    client.config.idGeneratorFn = () => "my_id";
    mockResponse(fixtures.withSuccess.response);
    const pendingRequest = waitForRequest();
    await client.exec("my_method", { foo: 123 }, "new_id");
    const req = (await pendingRequest) as any;
    expect(req.body.id).toBe("new_id");
  });
});
