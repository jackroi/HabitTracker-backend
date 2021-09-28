import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'express-jwt';                // JWT parsing middleware for express

// import routes
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import habitsRouter from './routes/habits';
import statsRouter from './routes/stats';
import categoriesRouter from './routes/categories';

import {
  RootResponseBody,
  ErrorResponseBody,
} from './httpTypes/responses';


export default function createApp(): express.Express {
  // Express application instance
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
    console.info(`Query: ${JSON.stringify(req.query)}`);
    console.info(`Body: ${JSON.stringify(req.body)}`);
    next();
  });


  // API routes

  // Version of the application
  const version = process.env.npm_package_version as string;

  // Root endpoint
  app.get(`/v${version}`, (_, res) => {
    const body: RootResponseBody = {
      error: false,
      statusCode: 200,
      apiVersion: version,
      endpoints: [
        '/',
        '/login',
        // TODO aggiungere tutti gli endpoint
      ],
    };
    return res.status(body.statusCode).json(body);
  });

  // All the other endpoints
  app.use(`/v${version}`, authRouter);
  app.use(`/v${version}/user`, usersRouter);
  app.use(`/v${version}/habits`, habitsRouter);
  app.use(`/v${version}/stats`, statsRouter);
  app.use(`/v${version}/categories`, categoriesRouter);



  // error handling middleware
  app.use((err: ErrorResponseBody | jwt.UnauthorizedError, _: Request, res: Response, __: NextFunction) => {
    let errorBody: ErrorResponseBody;
    if (err instanceof jwt.UnauthorizedError) {
      errorBody = { error: true, statusCode: err.status, errorMessage: 'User unauthorized' };
    }
    else {
      errorBody = err;
    }
    console.error('Request error: ' + JSON.stringify(errorBody));
    return res.status(errorBody.statusCode || 500).json(errorBody);
  });


  // last middleware (request with invalid endpoint)
  app.use((_, res) => {
    console.warn('Invalid endpoint');
    const errorBody: ErrorResponseBody = {
      statusCode: 404,
      error: true,
      errorMessage: 'Invalid endpoint',
    };
    res.status(errorBody.statusCode).json(errorBody);
  });

  return app;
}
