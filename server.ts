/**
 *
 *
 */

import express, { Request, Response, NextFunction } from 'express';
import cors = require('cors');

// add colorization to logs
import 'console-info';
import 'console-warn';
import 'console-error';


// ResponseBody types
interface ResponseBody {
  statusCode: number;
  error: boolean;
}

interface ErrorResponseBody extends ResponseBody {
  error: true;
  errorMessage: string;
}


const app = express();

// CORS
app.use(cors());

// automatically parse json body
app.use(express.json());

// logging middleware
app.use((req, _, next) => {
  console.info('------------------------------------------------');
  console.info(`New request for: ${req.url}`);
  console.info(`Method: ${req.method}`);
  next();
});

// API routes

app.get('/', (_, res) => {
  const jsonResponse = {
    apiVersion: process.env.npm_package_version,
    endpoints: [
      '/',
    ],
  };
  res.status(200).json(jsonResponse);
});


// error handling middleware
app.use((err: ErrorResponseBody, _: Request, res: Response, __: NextFunction) => {
  console.error('Request error:');
  console.error(JSON.stringify(err, null, 2));

  res.status(err.statusCode).json(err);
});


// last middleware (request with invalid endpoint)
app.use((_, res) => {
  console.warn('Invalid endpoint');
  const errorResponse: ErrorResponseBody = {
    statusCode: 404,
    error: true,
    errorMessage: 'Invalid endpoint',
  };
  res.status(404).json(errorResponse);
});





import http = require('http');                  // HTTP module

let server = http.createServer(app);

server.listen(8080, () => console.info("HTTP Server started on port 8080"));
