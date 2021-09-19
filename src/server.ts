/**
 *
 *
 */

console.info('Server starting...');

// load .env into process.env
import dotenv = require('dotenv');
const result = dotenv.config()

if (result.error) {
  console.error('Unable to load \'.env\' file. Please provide one to store the JWT secret key');
  process.exit(-1);
}
if (!process.env.JWT_SECRET
  || !process.env.DB_HOST
  || !process.env.DB_PORT
  || !process.env.DB_NAME
  || !process.env.SERVER_PORT) {
  console.error('\'.env\' file loaded but doesn\'t contain some required key-value pairs');
  process.exit(-1);
}
if (!process.env.npm_package_version) {
  console.error('Missing environment variabile npm_package_version');
  process.exit(-1);
}


import express, { Request, Response, NextFunction } from 'express';
import http from 'http';                      // HTTP module
import cors from 'cors';
import passport from 'passport';              // authentication middleware for Express
import passportHTTP from 'passport-http';     // implements Basic authentication for HTTP (used for /login endpoint)
import jsonwebtoken from 'jsonwebtoken';      // JWT generation
import jwt from 'express-jwt';                // JWT parsing middleware for express
import mongoose from 'mongoose';
// add colorization to logs
import 'console-info';
import 'console-warn';
import 'console-error';

import * as user from './models/User';
import * as habit from './models/Habit';

// import routes
import usersRouter from './routes/users';
import habitsRouter from './routes/habits';
import statsRouter from './routes/stats';
import categoriesRouter from './routes/categories';

import { getSocketIO, initializeSocketIO } from './initializeSocketIO';
import registerOnlineUserHandlers from './socketHandlers/onlineUserHandlers';

import {
  RegistrationRequestBody,
  isRegistrationRequestBody,
} from './httpTypes/requests';

import {
  RootResponseBody,
  ErrorResponseBody,
  LoginResponseBody,
  RegistrationResponseBody,
  BadRequestErrorResponseBody,
  InternalDbErrorResponseBody,
} from './httpTypes/responses';
import { validateEmail } from './utils/utils';
import { TokenData } from './types/TokenData';

declare global {
  namespace Express {
    interface User {
      name: string,
      email: string,
    }
  }
}


function generateJwtToken(tokenData: TokenData): string {
  console.info(`Generating token for ${tokenData.email}`);
  return jsonwebtoken.sign(tokenData, process.env.JWT_SECRET as string);
}



// Express application instance
const app = express();


// Configure HTTP basic authentication strategy
passport.use(new passportHTTP.BasicStrategy(async (username, password, done) => {
  // delegate function we provide to passport middleware
  // to verify user credentials

  console.info(`New login attempt from ${username}`);

  try {
    const userDocument = await user.getModel().findOne({ email: username }).exec();

    if (!userDocument) {
      console.info('Invalid email (not registered)');
      return (done as Function)(null, false, {
        statusCode: 401,
        error: true,
        errorMessage: 'Invalid email',
      });
    }

    if (!userDocument.validatePassword(password)) {
      console.info('Invalid password');
      return (done as Function)(null, false, {
        statusCode: 401,
        error: true,
        errormessage: 'Invalid password',
      });
    }

    console.info(`${username} logged in succesfully`);
    return done(null, userDocument);
  }
  catch (err) {
    console.error('Error occurred querying the database while logging in');
    console.error(JSON.stringify(err, null, 2));
    return done({
      statusCode: 500,
      error: true,
      errorMessage: 'Internal server error',
    });
  }

}));



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
const version = process.env.npm_package_version;

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


app.post(`/v${version}/register`, async (req, res, next) => {
  /**
   * body:
   * - name: string
   * - email: string
   * - password: string
   */

  if (!isRegistrationRequestBody(req.body)) {
    console.warn(`Wrong registration body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: BadRequestErrorResponseBody = new BadRequestErrorResponseBody(
      'Wrong registration body content'
    );
    return next(errorBody);
  }

  const newUser = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    registrationDate: new Date(),
  };

  // input validation
  let error: ErrorResponseBody | null = null;
  try {
    if (typeof(newUser.name) !== 'string' || newUser.name.trim().length === 0) {
      error = new BadRequestErrorResponseBody('Bad request: invalid field "name"');
    }
    else if (typeof(newUser.email) !== 'string'
        || newUser.email.trim().length === 0
        || !validateEmail(newUser.email.trim())) {
      error = new BadRequestErrorResponseBody('Bad request: invalid field "email"');
    }
    else if (typeof(newUser.password) !== 'string' || newUser.password.trim().length === 0) {
      error = new BadRequestErrorResponseBody('Bad request: invalid field "password"');
    }
    else if ((await user.getModel().findOne({ email: newUser.email.trim() }).exec())) {
      error = new BadRequestErrorResponseBody('This email is already registered');
    }
  }
  catch (err) {
    error = new InternalDbErrorResponseBody();
  }

  if (error) {
    return next(error);
  }

  newUser.name = newUser.name.trim();
  newUser.email = newUser.email.trim();

  try {
    await user.newUser(newUser).save();

    console.info(`New user created: ${newUser.email}`);

    // generate a JWT with the useful user data and return it as response
    const jwtToken = generateJwtToken({
      name: newUser.name,
      email: newUser.email,
    });

    const body: RegistrationResponseBody = {
      error: false,
      statusCode: 200,
      token: jwtToken,
    };

    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    console.error(`Failed to save new user into database\n${JSON.stringify(err, null, 2)}`);
    const errorBody: InternalDbErrorResponseBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
});


// login endpoint uses passport middleware to check
// user credentials before generating a new JWT
app.get(`/v${version}/login`, passport.authenticate('basic', { session: false }), (req, res, next) => {

  // If we reach this point, the user is successfully authenticated and
  // has been injected into req.user

  // verify that user has really been injected into req
  if (!req.user) {
    console.error('Internal login error: req.user is undefined');
    let errorBody: ErrorResponseBody = {
      statusCode: 500,
      error: true,
      errorMessage: 'Internal server error',
    };
    return next(errorBody);
  }

  console.info('Login granted. Generating token...');

  // generate a JWT with the useful user data and return it as response
  const jwtToken = generateJwtToken({
    name: req.user.name,
    email: req.user.email,
  });

  const body: LoginResponseBody = {
    error: false,
    statusCode: 200,
    token: jwtToken,
  };

  return res.status(body.statusCode).json(body);
});



// All the other endpoints
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



// Connect to mongodb and launch the HTTP server trough Express

const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  SERVER_PORT,
} = process.env;

mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: true,
})
.then(() => {
  console.info('Connected to MongoDB');
})
.then(() => {
  const server = http.createServer(app);

  // Initialize socketIO
  initializeSocketIO(server);
  // socketIO instance
  const io = getSocketIO();

  // For each socket that connects to the Server, register all the socketIO events.
  io.on('connection', (socket) => {
    console.info('Socket.io client connected');

    registerOnlineUserHandlers(io, socket);
  });

  server.listen(SERVER_PORT, () => console.info(`HTTP Server started on port ${SERVER_PORT}`));
})
.catch((err) => {
  console.error('Error occurred during initialization');
  console.error(err);
});
