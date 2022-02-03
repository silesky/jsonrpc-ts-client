import { setupServer } from "msw/node";
import { DefaultRequestBody, MockedRequest, rest } from "msw";

// instantiate server without handlers
export const server = setupServer();

export const JSONRPC_URL = "http://foo:8888/jsonrpc";

type Options = {
  status?: number;
};
export const mockResponse = (data: any, options: Options = {}) => {
  return server.use(
    rest.post(JSONRPC_URL, (_req, res, ctx) => {
      // The return is important in this callback, in spite of the typing (and express conventions).
      return res(ctx.status(options.status || 200), ctx.json(data));
    })
  );
};

export async function waitForRequest(numberOfRetries = 0, maxTimeout = 2) {
  let timeout = 0;
  const requests: MockedRequest<DefaultRequestBody>[] = [];
  return new Promise((resolve, reject) => {
    server.events.on("request:match", (req) => {
      requests.push(req);
      setInterval(() => {
        timeout += 1;
        if (timeout > maxTimeout) {
          return resolve(requests);
        }
      }, 1000);
      if (requests.length === numberOfRetries + 1) {
        return resolve(requests.length === 1 ? requests[0] : requests);
      }
    });
    server.events.on("request:unhandled", (req) => {
      reject(
        new Error(`The ${req.method} ${req.url.href} request was unhandled.`)
      );
    });
  });
}
