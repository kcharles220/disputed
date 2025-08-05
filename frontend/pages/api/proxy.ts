
import httpProxy from 'http-proxy';
import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingMessage, ServerResponse } from 'http';

const proxy = httpProxy.createProxyServer();
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001'; 

export const config = {
  api: {
    bodyParser: false, 
  },
};

interface ProxyHandlerRequest extends NextApiRequest, IncomingMessage {}
interface ProxyHandlerResponse extends NextApiResponse, ServerResponse {}

export default function handler(
    req: ProxyHandlerRequest,
    res: ProxyHandlerResponse
): Promise<void> {
    return new Promise((resolve, reject) => {
        proxy.web(req, res, { target: SERVER_URL }, (err: Error) => {
            if (err) {
                console.error('Proxy error:', err);
                res.status(500).end('Proxy error');
                return reject(err);
            }
            resolve();
        });
    });
}