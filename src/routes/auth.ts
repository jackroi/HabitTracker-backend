import express from 'express';
import passport from 'passport';              // authentication middleware for Express
import passportHTTP from 'passport-http';     // implements Basic authentication for HTTP (used for /login endpoint)
import jsonwebtoken from 'jsonwebtoken';      // JWT generation

import * as user from '../models/User';

import {
  RegistrationRequestBody,
  isRegistrationRequestBody,
} from '../httpTypes/requests';

import {
  ErrorResponseBody,
  LoginResponseBody,
  RegistrationResponseBody,
  BadRequestErrorResponseBody,
  InternalDbErrorResponseBody,
} from '../httpTypes/responses';
import { validateEmail } from '../utils/utils';
import { TokenData } from '../types/TokenData';

const router = express.Router();
export default router;


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



router.post(`/register`, async (req, res, next) => {
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
router.get(`/login`, passport.authenticate('basic', { session: false }), (req, res, next) => {

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

