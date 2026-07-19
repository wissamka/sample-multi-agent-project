import { IncomingMessage, ServerResponse } from 'http';
import { app } from '../src/server/src/index';

// Single serverless entry for the whole Express API. Vercel rewrites
// /api/* here (see vercel.json); Express routes are mounted at root,
// so strip the prefix before handing the request over.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  req.url = (req.url ?? '/').replace(/^\/api/, '') || '/';
  return app(req, res);
}
