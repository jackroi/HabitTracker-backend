/**
 * Habits endpoints.
 */


import express from 'express';
import auth from '../middlewares/auth';

import {
  isAddHabitRequestBody,
  isAddHistoryEntryRequestBody,
  isUpdateHabitRequestBody,
  isUpdateHistoryEntryRequestBody,
  UpdateHabitRequestBody
} from '../httpTypes/requests';
import {
  AddHabitResponseBody,
  ErrorResponseBody,
  GetHabitHistoryResponseBody,
  GetHabitResponseBody,
  GetHabitsResponseBody,
  SuccessResponseBody
} from '../httpTypes/responses';


import * as habit from '../models/Habit';
import { Habit } from '../models/Habit';
import { HistoryEntry, HistoryEntryDocument } from '../models/HistoryEntry';


const router = express.Router();
export default router;


/**
 * Returns the list of habits of the logged in user.
 *
 * Query parameters:
 * - filter: The type of habits to return (valid options are `all`, `archived`, `active`). Default: `active`.
 * - category: The category of habits to return. By default returns all the habits. Default: `` (all).
 * - skip: The number of habits to skip. Default: 0.
 * - limit: The maximum number of habits to return. Default: 50.
 */
router.get(`/`, auth, async (req, res, next) => {
  let { filter, category, skip, limit } = req.query;

  // filter for mongodb query
  const queryFilter: { userEmail: string, archived?: boolean, category?: string } = {
    userEmail: req.user!.email,
  };

  // filter param validation
  filter = filter || 'active';          // if filter is not defined, default to `active`
  if (filter === 'archived') {          // if filter is `archived`
    queryFilter.archived = true;        // select only archived habits
  }
  else if (filter === 'active') {       // if filter is `active`
    queryFilter.archived = false;       // select only active habits
  }
  else if (filter === 'all') {          // if filter is `all`
    // do nothing                       // select all the habits (don't put any constraint)
  }
  else {                                // filter has an invalid value
    console.warn('Invalid query param "filter"');
    queryFilter.archived = false;       // use default
  }

  // category param validation
  if (category && typeof(category) === 'string') {
    queryFilter.category = category;    // add category to the query filter
  }

  // skip and limit params validation
  let skipNumber: number = parseInt(skip as string || '0') || 0;
  let limitNumber: number = parseInt(limit as string || '50') || 50;

  try {
    const habits = await habit.getModel()
      .find(queryFilter, { userEmail: 0, __v: 0 })
      .skip(skipNumber)
      .limit(limitNumber);

    // Transform list of habits in the expected format
    const returnedHabits = habits.map((habit) => ({
      id: habit._id as string,
      name: habit.name,
      creationDate: habit.creationDate.toISOString(),
      category: habit.category,
      archived: habit.archived,
    }));

    const body: GetHabitsResponseBody = {
      error: false,
      statusCode: 200,
      habits: returnedHabits,
    };

    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
})


/**
 * Creates a new Habit.
 */
router.post(`/`, auth, async (req, res, next) => {
  if (!isAddHabitRequestBody(req.body)) {
    console.warn(`Wrong add habit body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 400,
      errorMessage: 'Wrong add habit body content',
    };
    return next(errorBody);
  }

  try {
    const newHabitData = {
      name: req.body.name,
      category: req.body.category,
      email: req.user!.email,
    };

    const newHabit = await habit.newHabit(newHabitData).save();
    const returnedHabit = {
      id: newHabit._id as string,
      name: newHabit.name,
      creationDate: newHabit.creationDate.toISOString(),
      category: newHabit.category,
      archived: newHabit.archived,
    };

    const body: AddHabitResponseBody = {
      error: false,
      statusCode: 200,
      habit: returnedHabit,
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
 * Retrives the habit details.
 */
router.get(`/:habit_id`, auth, async (req, res, next) => {
  try {
    // Query the db for the habit
    const requestedHabit = await habit.getModel().findOne({
      _id: req.params.habit_id,         // must have the given id
      userEmail: req.user!.email,       // must be of the logged in user
    });

    if (!requestedHabit) {
      console.warn('User asked details about an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }

    // format habit
    const habitToReturn = {
      id: requestedHabit._id as string,
      name: requestedHabit.name,
      creationDate: requestedHabit.creationDate.toISOString(),
      category: requestedHabit.category,
      archived: requestedHabit.archived,
    };

    const body: GetHabitResponseBody = {
      error: false,
      statusCode: 200,
      habit: habitToReturn,
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
 * Update the habit.
 */
router.put(`/:habit_id`, auth, async (req, res, next) => {
  if (!isUpdateHabitRequestBody(req.body)) {
    console.warn(`Wrong update habit body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 400,
      errorMessage: 'Wrong update habit body content',
    };
    return next(errorBody);
  }

  try {
    const cleanedUpdateHabitData: UpdateHabitRequestBody = {};

    if (req.body.name) {
      cleanedUpdateHabitData.name = req.body.name;
    }
    if (req.body.category) {
      cleanedUpdateHabitData.category = req.body.category;
    }
    if (req.body.archived !== undefined && req.body.archived !== null) {
      cleanedUpdateHabitData.archived = req.body.archived;
    }

    const queryResult = await habit.getModel()
      .updateOne({ _id: req.params.habit_id, userEmail: req.user!.email }, cleanedUpdateHabitData)
      .exec();

    // Check update query result
    if (queryResult.n === 0) {                        // habit non found
      // send failure response
      console.warn('User tried to modify an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }
    else {                                            // habit modified succesfully
      // send success response
      const body: SuccessResponseBody = {
        error: false,
        statusCode: 200,
      };
      return res.status(body.statusCode).json(body);
    }
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});


/**
 * Delete the habit.
 */
router.delete(`/:habit_id`, auth, async (req, res, next) => {
  try {
    const queryResult = await habit.getModel()
      .deleteOne({ _id: req.params.habit_id, userEmail: req.user!.email })
      .exec();

    if (queryResult.deletedCount === 0) {                        // habit non found
      // send failure response
      console.warn('User tried to delete an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }
    else {
      // send success response
      const body: SuccessResponseBody = {
        error: false,
        statusCode: 200,
      };
      return res.status(body.statusCode).json(body);
    }
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});




// Habit history endpoints





/**
 * Retrives the history of the habit.
 * TODO valutare skip e limit
 */
router.get(`/:habit_id/history`, auth, async (req, res, next) => {
  try {
    const requestedHabit = await habit.getModel()
      .findOne({ _id: req.params.habit_id, userEmail: req.user!.email })
      .exec();

    if (!requestedHabit) {                         // habit non found
      // send failure response
      console.warn('User asked for the history of an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }
    else {
      const history = requestedHabit.history.map(historyEntry => ({
        id: (historyEntry as HistoryEntryDocument)._id,
        date: historyEntry.date.toISOString(),
        type: historyEntry.type,
      }));

      // send success response
      const body: GetHabitHistoryResponseBody = {
        error: false,
        statusCode: 200,
        history: history,
      };
      return res.status(body.statusCode).json(body);
    }
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});


/**
 * Adds a new entry to the habit history.
 * TODO valutare se va bene che, in caso una entry esista già per quella data, venga sovrascritta
 */
router.post(`/:habit_id/history`, auth, async (req, res, next) => {
  if (!isAddHistoryEntryRequestBody(req.body)) {
    console.warn(`Wrong add history entry body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 400,
      errorMessage: 'Wrong add history entry body content',
    };
    return next(errorBody);
  }

  try {
    const requestedHabit = await habit.getModel()
      .findOne({ _id: req.params.habit_id, userEmail: req.user!.email })
      .exec();

    if (!requestedHabit) {                         // habit non found
      // send failure response
      console.warn('User asked to add an history entry to an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }

    // check if a history entry for that day already exists
    requestedHabit.insertHistoryEntry({
      date: new Date(req.body.date),
      type: req.body.type,
    });
    await requestedHabit.save();

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


// TODO valutare l'utilizzo della data al posto dell'hist_id

/**
 * Updates (the type of) an entry of the habit history.
 * TODO scrivere meglio documentazione
 * date: YYYY-MM-DD (string)
 */
router.put(`/:habit_id/history/:date`, auth, async (req, res, next) => {
  // TODO maybe check date format
  if (!isUpdateHistoryEntryRequestBody(req.body)) {
    console.warn(`Wrong update history entry body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 400,
      errorMessage: 'Wrong update history entry body content',
    };
    return next(errorBody);
  }

  try {
    const requestedHabit = await habit.getModel()
      .findOne({ _id: req.params.habit_id, userEmail: req.user!.email })
      .exec();

    if (!requestedHabit) {                         // habit non found
      // send failure response
      console.warn('User asked to update an history entry to an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }

    // update history entry
    requestedHabit.insertHistoryEntry({
      date: new Date(req.params.date),
      type: req.body.type,
    });
    await requestedHabit.save();

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
 * Deletes (the type of) an entry of the habit history.
 * TODO scrivere meglio documentazione
 * date: YYYY-MM-DD (string)
 */
router.delete(`/:habit_id/history/:date`, auth, async (req, res, next) => {
  try {
    const requestedHabit = await habit.getModel()
      .findOne({ _id: req.params.habit_id, userEmail: req.user!.email })
      .exec();

    if (!requestedHabit) {                         // habit non found
      // send failure response
      console.warn('User asked to delete an history entry of an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }

    // update history entry
    requestedHabit.deleteHistoryEntry(new Date(req.params.date));
    await requestedHabit.save();

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
