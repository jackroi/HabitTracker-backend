/**
 * Categories endpoints.
 */


import express from 'express';
import { isUpdateCategoryNameRequestBody } from '../httpTypes/requests';
import { ErrorResponseBody, GetCategoriesResponseBody, SuccessResponseBody } from '../httpTypes/responses';

import auth from '../middlewares/auth'

import * as habit from '../models/Habit';


const router = express.Router();
export default router;


/**
 * Returns the list of categories of the logged in user.
 */
router.get(`/`, auth, async (req, res, next) => {

  try {
    // Get distinct categories
    const categories = (await habit.getModel().distinct('category').exec()) as string[];

    const body: GetCategoriesResponseBody = {
      error: false,
      statusCode: 200,
      categories: categories,
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});


/**
 * Update the name of the category.
 */
router.put(`/:category_name`, auth, async (req, res, next) => {
  if (!isUpdateCategoryNameRequestBody(req.body)) {
    console.warn(`Wrong update category name body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 400,
      errorMessage: 'Wrong update category name body content',
    };
    return next(errorBody);
  }

  const oldName = req.params.category_name;
  const newName = req.body.name;
  console.info(`Renaming category '${oldName}' into '${newName}'`);

  try {
    // Update the category name of all the habits with the old category name
    await habit.getModel().updateMany({ category: oldName }, { category: newName }).exec();

    const body: SuccessResponseBody = {
      error: false,
      statusCode: 200,
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});



/**
 * Delete the category.
 * TODO non serve in realtà
 */
router.delete(`/:category_name`, auth, async (req, res, next) => {

});
