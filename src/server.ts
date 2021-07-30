/**
 *
 *
 */

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';                      // HTTP module
import cors from 'cors';
import passport from 'passport';              // authentication middleware for Express
import passportHTTP from 'passport-http';     // implements Basic authentication for HTTP (used for /login endpoint)
import jsonwebtoken from 'jsonwebtoken';      // JWT generation
import jwt from 'express-jwt';                // JWT parsing middleware for express
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// add colorization to logs
import 'console-info';
import 'console-warn';
import 'console-error';

import * as user from './models/User';
import * as habit from './models/Habit';



// ResponseBody types
interface ResponseBody {
  statusCode: number;
  error: boolean;
}

interface ErrorResponseBody extends ResponseBody {
  error: true;
  errorMessage: string;
}

declare global {
  namespace Express {
    interface User {
      name: string,
      email: string,
    }
  }
}


console.info('Server starting...');


// load .env into process.env
const result = dotenv.config();
if (result.error) {
  console.error('Unable to load ".env" file');
  process.exit(-1);
}

console.info('".env" file loaded');

if(!process.env.JWT_SECRET) {
  console.error('JWT_SECRET=<secret> key-value pair was not found in ".env"');
  process.exit(-1);
}


const app = express();

const auth = jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
});


passport.use(new passportHTTP.BasicStrategy((username, password, done) => {
  // delegate function we provide to passport middleware
  // to verify user credentials

  console.info(`New login attempt from ${username}`);
  user.getModel().findOne({ email: username }, null, null, (err, userDocument) => {
    if (err) {
      console.error('Error occurred querying the database while logging in');
      console.error(JSON.stringify(err, null, 2));
      return done({
        statusCode: 500,
        error: true,
        errorMessage: 'Internal server error',
      });
    }

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
  });
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
  console.info(`Body:\n${JSON.stringify(req.body, null, 2)}`);
  next();
});

// API routes

app.get('/', (_, res) => {
  const jsonResponse = {
    apiVersion: process.env.npm_package_version,
    endpoints: [
      '/',
      '/login',
    ],
  };
  res.status(200).json(jsonResponse);
});



interface TokenData {
  name: string;
  email: string;
}
const generateJwtToken = (tokenData: TokenData): string => {
  console.info(`Generating token for ${tokenData.email}`);
  return jsonwebtoken.sign(tokenData, process.env.JWT_SECRET as string);
}


app.post('/register', async (req, res, next) => {
  /**
   * body:
   * - name: string
   * - email: string
   * - password: string
   */

  // TODO pensare se mettere try catch

  const newUser = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    registrationDate: new Date(),
  };

  // input validation
  let error: ErrorResponseBody | null = null;
  // TODO costruttore per 400 bad request
  if (typeof(newUser.name) !== 'string' || newUser.name.trim().length === 0) {
    error = {
      statusCode: 400,
      error: true,
      errorMessage: 'Bad request: invalid field "name"',
    };
  } else if (typeof(newUser.email) !== 'string' || newUser.email.trim().length === 0) {   // TODO validate email with regex
    error = {
      statusCode: 400,
      error: true,
      errorMessage: 'Bad request: invalid field "email"',
    };
  } else if (typeof(newUser.password) !== 'string' || newUser.password.trim().length === 0) {
    // TODO validate password with regex ???
    error = {
      statusCode: 400,
      error: true,
      errorMessage: 'Bad request: invalid field "password"',
    };
  } else if ((await user.getModel().findOne({ email: newUser.email }).exec())) {
    error = {
      statusCode: 409,
      error: true,
      errorMessage: 'This email is already registered',
    };
  }

  if (error) {
    return next(error);
  }

  // TODO forse gestire errore in caso di inserimento email esistente
  await user.newUser(newUser).save();

  console.info(`New user created: ${newUser.email}`);

  // generate a JWT with the useful user data and return it as response
  const jwtToken = generateJwtToken({
    name: newUser.name,
    email: newUser.email,
  });

  return res.status(201).json({
    statusCode: 201,
    error: false,
    token: jwtToken,
  });
});


// login endpoint uses passport middleware to check
// user credentials before generating a new JWT
app.get('/login', passport.authenticate('basic', { session: false }), (req, res, next) => {

  // If we reach this point, the user is successfully authenticated and
  // has been injected into req.user

  // verify that user has really been injected into req
  if (!req.user) {
    console.error('req.user is undefined');
    let error: ErrorResponseBody = {      // TODO magari fare una classe apposta che crei questo errore
      statusCode: 500,
      error: true,
      errorMessage: 'Internal server error',
    };
    return next(error);
  }

  // generate a JWT with the useful user data and return it as response
  const jwtToken = generateJwtToken({
    name: req.user.name,
    email: req.user.email,
  });

  return res.status(200).json({
    statusCode: 200,
    error: false,
    token: jwtToken
  });
});




app.route('/habits').get(auth, async (req, res, next) => {
  let { filter, skip, limit } = req.query;

  // filter for mongodb query
  const queryFilter: { userEmail: string, archived?: boolean } = {
    userEmail: req.user!.email,
  };

  // filter param validation
  filter = filter || 'not_archived';
  if (filter === 'archived') {
    queryFilter.archived = true;
  } else if (filter === 'not_archived') {
    queryFilter.archived = false;
  } else if (filter === 'all') {
    // do nothing
  } else {
    // filter has an invalid value
    console.warn('Invalid query param "filter"');
    queryFilter.archived = false;     // use default
  }

  // skip and limit params validation
  let skipNumber: number = parseInt(skip as string || '0') || 0;
  let limitNumber: number = parseInt(limit as string || '50') || 50;

  const habits = await habit.getModel()
    .find(queryFilter, { userEmail: 0, __v: 0 })
    .skip(skipNumber)
    .limit(limitNumber);

  const returnedHabits = habits.map((habit) => ({
    id: habit._id,
    name: habit.name,
    creationDate: habit.creationDate,
    category: habit.category,
    archived: habit.archived,
  }));

  res.status(200).json({
    statusCode: 200,
    error: false,
    habits: returnedHabits,
  });
})
.post(auth, (req, res, next) => {
  const newHabit = {
    name: req.body.name,
    category: req.body.category,
    creationDate: new Date(),
    archived: false,
    userEmail: req.user!.email,
  };
});




// error handling middleware
app.use((err: ErrorResponseBody | jwt.UnauthorizedError, _: Request, res: Response, __: NextFunction) => {
  if (err instanceof jwt.UnauthorizedError) {     // authentication related error
    console.warn(`jwt.UnauthorizedError\n${JSON.stringify(err, null, 2)}`)
    return res.status(err.status).json({
      statusCode: err.status,
      error: true,
      errorMessage: err.message,
    });
  } else {                                        // other error types
    const errString = JSON.stringify(err, null, 2);
    if (err.statusCode.toString().charAt(0) === '5') {      // 5xx internal server error
      console.error(`Internal server error\n${errString}`);
    } else {
      console.warn(`Error\n${errString}`);
    }
    return res.status(err.statusCode).json(err);
  }
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




// TODO maybe in .env
const PORT = 8080;

mongoose.connect('mongodb://habit-tracker-db:27017/habittracker', {
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
  server.listen(PORT, () => console.info(`HTTP Server started on port ${PORT}`));
})
.catch((err) => {
  console.error('Error occurred during initialization');
  console.error(err);
});
