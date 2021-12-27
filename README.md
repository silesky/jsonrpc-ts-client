### A modern typescript client for [JSON-RPC 2.0](https://www.jsonrpc.org/specification).

![Build Status](https://img.shields.io/github/workflow/status/silesky/jsonrpc-ts-client/CI/main?label=build)

Check out the [Open RPC Ecosystem](https://open-rpc.org/) for more tools.

### Installation
npm
```
npm install axios jsonrpc-ts-client
```
yarn
```
yarn add axios jsonrpc-ts-client
```


## Usage
```ts
import uuid from 'uuid'
import JSONRPC, { ErrorCode } from 'jsonrpc-ts-client'

interface UserDto { // ideally, these are generated from your JSON Schema.
  name: string,
  occupation: string,
  id: string
}

const client = new JSONRPC({
  baseUrl: 'https://foo.com/jsonrpc'
  idGeneratorFn: uuid.v4, // optional, you can also pass an ID as an argument to `exec`.
})

const response = await client.exec<UserDto>('my_method', { foo: 123 }); // sends payload {jsonrpc: '2.0',  params: ...}
if (response.isSuccess()) { // returns an Either<JsonRpcError, Result>
  console.log(response.result.name)
  console.log(response.result.occupation)
} else if (response.isError()) {
  // more information on errors: https://www.jsonrpc.org/specification#error_object
  console.log(result.error.message) // e.g. Invalid params
  console.log(result.error.code) // e.g 32603
}

// as an "escape valve", you can unwrap the result response by throwing an error.
const result = response.unsafeCoerce()
console.log(result.name)

```