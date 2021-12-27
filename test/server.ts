import { setupServer } from 'msw/node';
import { rest } from 'msw';

// instantiate server without handlers
export const server = setupServer();

export const JSONRPC_URL = 'http://foo:8888/jsonrpc';

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

export function waitForRequest() {
  return new Promise((resolve, reject) => {
    server.events.on('request:match', (req) => {
      resolve(req);
    });
    server.events.on('request:unhandled', (req) => {
      reject(
        new Error(`The ${req.method} ${req.url.href} request was unhandled.`)
      );
    });
  });
}
