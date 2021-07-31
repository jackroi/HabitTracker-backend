/**
 * Users endpoints.
 */


import express from 'express';
import { GetUserResponseBody, SuccessResponseBody } from '../httpTypes/responses';

import auth from '../middlewares/auth'

import * as users from '../models/User';
import * as habits from '../models/Habit';


const router = express.Router();
export default router;



/**
 * Returns information about the logged in user.
 */
router.get(`/`, auth, async (req, res, next) => {
  try {
    const user = await users.getModel().findOne({ email: req.user!.email }).exec();
    if (!user) {
      // User not found
      console.warn(`An invalid user requested information about his account, ${req.user!.email}`);
      const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal server error' };
      return next(errorBody);
    }

    // User found

    // Construct and send response body
    const body: GetUserResponseBody = {
      error: false,
      statusCode: 200,
      user: {
        name: user.name,
        email: user.email,
        registrationDate: user.registrationDate.toISOString(),
      },
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // An internal DB error occurred
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});


/**
 * Deletes the the logged in user account.
 */
router.delete(`/`, auth, async (req, res, next) => {
  try {
    console.info(`Deleting the account of the user with email '${req.user!.email}'`);

    // Delete all habits
    await habits.getModel().deleteMany({ userEmail: req.user!.email }).exec();

    // Delete user
    await users.getModel().deleteOne({ email: req.user!.email }).exec();

    // Construct and send response body
    const body: SuccessResponseBody = {
      error: false,
      statusCode: 200,
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // An internal DB error occurred
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});
