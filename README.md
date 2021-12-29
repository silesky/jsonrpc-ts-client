### Warning: this is in alpha.

### A modern isomorphic typescript client for [JSON-RPC 2.0](https://www.jsonrpc.org/specification).

![Build Status](https://img.shields.io/github/workflow/status/silesky/jsonrpc-ts-client/CI/main?label=build)

Check out the [Open RPC Ecosystem](https://open-rpc.org/) for more tools.

## Feature Table
| Feature                      | Supported
| ---------------------------- | -------- |
| Isomorphism                  |  ✅      |
| Batch Support                |  ✅      |
| Contract Support            |   Experimental |

### Installation
```
npm install jsonrpc-ts-client --save
```
or
```
yarn add jsonrpc-ts-client
```


## Basic Usage
```ts
import JSONRPC from 'jsonrpc-ts-client'

interface UserDto { // ideally, these are generated from your JSON Schema.
  name: string,
  occupation: string,
}

const client = new JSONRPC({
  url: 'https://foo.com/jsonrpc'
})

const response = await client.exec<UserDto>('my_method', { userId: 123 }); // sends payload {jsonrpc: '2.0',  params: ...}
if (response.isSuccess()) { // returns an Either<JsonRpcError, Result>
  console.log(response.result.name)
  console.log(response.result.occupation)
} else if (response.isError()) {
  // more information on errors: https://www.jsonrpc.org/specification#error_object
  console.log(result.error.message) // e.g. "Invalid Params"
  console.log(result.error.code) // e.g -32603
}

// as an "escape valve", you can unwrap the result response by throwing an error.
const result = response.unsafeCoerce()
console.log(result.name)

```

##  ID Generation
Generate IDs automatically, and/or override or set them on a per-request basis.

```ts

import JSONRPC from 'jsonrpc-ts-client'
import uuid from 'uuid'

const client = new JSONRPC({
  ...
  idGeneratorFn: uuid.v4,
})

// Override generate IDs
const response = await client.exec<UserDto>('my_method', { userId: 123 }, 'MY_OVERRIDING_ID'); // sends payload {jsonrpc: '2.0', id: 'MY_OVERRIDING_ID',  params: ...}
```

## Batch Support
You can make [batch requests](https://www.jsonrpc.org/specification#batch) per the JSON-RPC specification.
```ts

import JSONRPC from 'jsonrpc-ts-client'

const client = new JSONRPC({
  url: 'https://foo.com/jsonrpc'
})

 const responses = await client.execBatch<[UserDto, ConfigDto]>([
    { method: "get_user",  params: { userId: 123 }, id: "foo" },
    { method: "get_config" },
  ]);
```

## API Contract Declaration Support (experimental)
```ts

import JSONRPC from 'jsonrpc-ts-client'


type MyApiContract = {
  getUser: (params: UserParamsDto) => UserDto;
  getConfig: () => ConfigDto,
};

// pass in your api contract to get type-safety and autocomplete
const client = new JsonRpcClient<MyApiContract>({
  idGeneratorFn: uuid.v4,
  url: JSONRPC_URL,
});

   const foo = await newClient.execContract({
    method: "getUser", // autocomplete!
    params: { userId: 123 }, // autocomplete!
  });

```