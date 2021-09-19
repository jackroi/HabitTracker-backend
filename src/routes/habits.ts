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
  BadRequestErrorResponseBody,
  ErrorResponseBody,
  GetHabitHistoryResponseBody,
  GetHabitResponseBody,
  GetHabitsForDateResponseBody,
  GetHabitsResponseBody,
  InternalDbErrorResponseBody,
  SuccessResponseBody
} from '../httpTypes/responses';


import * as habit from '../models/Habit';
import { Habit, HabitState, HabitType } from '../models/Habit';
import { HistoryEntry, HistoryEntryDocument, HistoryEntryType } from '../models/HistoryEntry';
import { DateTime, DurationObjectUnits, DurationUnits } from 'luxon';
import { OnlineUserManager } from '../OnlineUserManager';
import { validateIsoDate } from '../utils/utils';


const router = express.Router();
export default router;

const onlineUserManager = OnlineUserManager.getInstance();

function getUnit(type: HabitType): keyof DurationObjectUnits {
  let unit: keyof DurationObjectUnits;
  switch (type) {
    case HabitType.DAILY:
      unit = 'day';
      break;
    case HabitType.WEEKLY:
      unit = 'week';
      break;
    case HabitType.MONTHLY:
      unit = 'month';
      break;

    default:
      // Make sure all the HabitType cases are covered
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }

  return unit;
}


/**
 * Returns the list of habits of the logged in user.
 *
 * Query parameters:
 * - filter: The type of habits to return (valid options are `all`, `archived`, `active`). Default: `active`.
 * - category: The category of habits to return. By default returns all the habits. Default: `` (all).
 * - skip: The number of habits to skip. Default: 0.
 * - limit: The maximum number of habits to return. Default: 50.
 * - date: The date for which to return the habits, in the format YYYY-MM-DD. Default: `` (all).
 */
router.get(`/`, auth, async (req, res, next) => {
  let { filter, category, skip, limit, date } = req.query;

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

    // date param validation
    if (date && typeof(date) === 'string') {
      // Check date format (YYYY-MM-DD)
      if (!validateIsoDate(date)) {
        console.warn('Invalid format of the "date" parameter');
        const errorBody: ErrorResponseBody = new BadRequestErrorResponseBody(
          'Invalid format of the "date" parameter'
        );
        return next(errorBody);
      }

      // Get date
      const givenDate = DateTime.fromISO(new Date(date).toISOString()).toUTC().startOf('day');

      // Transform list of habits in the expected format
      const returnedHabits = habits
        .filter((habit) => {
          // Filter out all the habits that not existed in the given date
          // TODO valutare se voglio davvero non mostrare habit che in givenDate non erano ancora stati creati
          // return true;
          return DateTime.fromISO(habit.creationDate.toISOString()).startOf('day').toUTC() <= givenDate;
        })
        .map((habit) => {
          const historyEntry = habit.history.find((historyEntry) => {
            return DateTime.fromISO(historyEntry.date.toISOString()).hasSame(givenDate, getUnit(habit.type));
          });

          let habitState: HabitState;
          switch (historyEntry?.type) {
            case HistoryEntryType.COMPLETED:
              habitState = HabitState.COMPLETED;
              break;

            case HistoryEntryType.SKIPPED:
              habitState = HabitState.SKIPPED;
              break;

            case undefined:
              habitState = HabitState.NOT_COMPLETED;
              break;
          }

          return {
            id: habit._id as string,
            name: habit.name,
            creationDate: habit.creationDate.toISOString(),
            category: habit.category,
            type: habit.type,
            state: habitState,
            archived: habit.archived,
          };
        });

      const body: GetHabitsForDateResponseBody = {
        error: false,
        statusCode: 200,
        habits: returnedHabits,
      };
      return res.status(body.statusCode).json(body);
    }
    else {
      // Transform list of habits in the expected format
      const returnedHabits = habits.map((habit) => ({
        id: habit._id as string,
        name: habit.name,
        creationDate: habit.creationDate.toISOString(),
        category: habit.category,
        type: habit.type,
        archived: habit.archived,
      }));

      const body: GetHabitsResponseBody = {
        error: false,
        statusCode: 200,
        habits: returnedHabits,
      };
      return res.status(body.statusCode).json(body);
    }

  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
})


/**
 * Creates a new Habit.
 */
router.post(`/`, auth, async (req, res, next) => {
  if (!isAddHabitRequestBody(req.body)) {
    console.warn(`Wrong add habit body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = new BadRequestErrorResponseBody(
      'Wrong add habit body content'
    );
    return next(errorBody);
  }

  try {
    const newHabitData = {
      name: req.body.name.trim(),
      category: req.body.category.trim(),
      type: req.body.type,
      email: req.user!.email,
    };

    // Ensure the current user has no habit with that name
    const habitWithThatName = await habit.getModel().findOne({ userEmail: newHabitData.email, name: newHabitData.name }).exec();
    if (habitWithThatName) {
      const errorBody: ErrorResponseBody = {
        error: true,
        statusCode: 409,
        errorMessage: 'A habit with this name already exists',
      }
      return next(errorBody);
    }

    // Create the new habit
    const newHabit = await habit.newHabit(newHabitData).save();
    console.info('New habit created', newHabit);
    const returnedHabit = {
      id: newHabit._id as string,
      name: newHabit.name,
      creationDate: newHabit.creationDate.toISOString(),
      category: newHabit.category,
      type: newHabit.type,
      archived: newHabit.archived,
    };

    const sockets = onlineUserManager.getSocketsFromUser(req.user!.email);
    for (let socket of sockets) {
      socket.emit('habitCreated', returnedHabit.id);
      console.info('emit', 'habitCreated');
    }

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
    const errorBody = new InternalDbErrorResponseBody();
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
    }).exec();

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
      type: requestedHabit.type,
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
    const errorBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
});

/**
 * Update the habit.
 */
router.put(`/:habit_id`, auth, async (req, res, next) => {
  if (!isUpdateHabitRequestBody(req.body)) {
    console.warn(`Wrong update habit body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = new BadRequestErrorResponseBody(
      'Wrong update habit body content'
    );
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
      const sockets = onlineUserManager.getSocketsFromUser(req.user!.email);
      for (let socket of sockets) {
        socket.emit('habitUpdated', req.params.habit_id);
        console.info('emit', 'habitUpdated');
      }

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
    const errorBody = new InternalDbErrorResponseBody();
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
      const sockets = onlineUserManager.getSocketsFromUser(req.user!.email);
      for (let socket of sockets) {
        socket.emit('habitDeleted', req.params.habit_id);
        console.info('emit', 'habitDeleted');
      }

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
    const errorBody = new InternalDbErrorResponseBody();
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
    const errorBody = new InternalDbErrorResponseBody();
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
    const errorBody: ErrorResponseBody = new BadRequestErrorResponseBody(
      'Wrong add history entry body content'
    );
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

    const sockets = onlineUserManager.getSocketsFromUser(req.user!.email);
    for (let socket of sockets) {
      socket.emit('habitHistoryUpdated', req.params.habit_id);
      console.info('emit', 'habitHistoryUpdated');
    }

    const body: SuccessResponseBody = {
      error: false,
      statusCode: 200,
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
});


// TODO a better implementation would request the timezone of the client, too. (date depends on timezone)
// TODO maybe not in this particular case (da capire)
// TODO verificare se client e server interpretano date nello stesso modo (stessa timezone)


/**
 * Updates (the type of) an entry of the habit history.
 * TODO scrivere meglio documentazione
 * date: YYYY-MM-DD (string)
 */
router.put(`/:habit_id/history/:date`, auth, async (req, res, next) => {
  // Check date format (YYYY-MM-DD)
  if (!validateIsoDate(req.params.date)) {
    console.warn('Invalid format of the "date" parameter');
    const errorBody: ErrorResponseBody = new BadRequestErrorResponseBody(
      'Invalid format of the "date" parameter'
    );
    return next(errorBody);
  }

  // Check body format
  if (!isUpdateHistoryEntryRequestBody(req.body)) {
    console.warn(`Wrong update history entry body content\n${JSON.stringify(req.body, null, 2)}`);
    const errorBody: ErrorResponseBody = new BadRequestErrorResponseBody(
      'Wrong update history entry body content'
    );
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

    const sockets = onlineUserManager.getSocketsFromUser(req.user!.email);
    for (let socket of sockets) {
      socket.emit('habitHistoryUpdated', req.params.habit_id);
      console.info('emit', 'habitHistoryUpdated');
    }

    const body: SuccessResponseBody = {
      error: false,
      statusCode: 200,
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
});


/**
 * Deletes an entry of the habit history.
 * TODO scrivere meglio documentazione
 * date: YYYY-MM-DD (string)
 */
router.delete(`/:habit_id/history/:date`, auth, async (req, res, next) => {
  // Check date format (YYYY-MM-DD)
  if (!validateIsoDate(req.params.date)) {
    console.warn('Invalid format of the "date" parameter');
    const errorBody: ErrorResponseBody = new BadRequestErrorResponseBody(
      'Invalid format of the "date" parameter'
    );
    return next(errorBody);
  }

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

    const sockets = onlineUserManager.getSocketsFromUser(req.user!.email);
    for (let socket of sockets) {
      socket.emit('habitHistoryUpdated', req.params.habit_id);
      console.info('emit', 'habitHistoryUpdated');
    }

    const body: SuccessResponseBody = {
      error: false,
      statusCode: 200,
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // Internal DB error happened
    console.error(`Internal DB error\n${JSON.stringify(err, null, 2)}`);
    const errorBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
});
