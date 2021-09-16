/**
 * Statistics endpoints.
 */


import express from 'express';

import luxon, { DurationInput, DurationObjectUnits, DurationUnits } from 'luxon';
import { DateTime } from 'luxon';
import { ErrorResponseBody, GetGeneralStatsResponseBody, GetHabitStatsResponseBody, InternalDbErrorResponseBody } from '../httpTypes/responses';

import auth from '../middlewares/auth'

import * as habit from '../models/Habit';
import { Habit, HabitType } from '../models/Habit';
import { HistoryEntry, HistoryEntryType } from '../models/HistoryEntry';


const router = express.Router();
export default router;


interface StreakInfo {
  startDate: DateTime,
  length: number,         // number of completed and skipped (circa)
  value: number,          // number of completed (circa)
  type: HabitType,
};


function getStreakList(habit: Habit): StreakInfo[] {
  const extractDate = (historyEntry: HistoryEntry): DateTime => DateTime.fromISO(historyEntry.date.toISOString()).toUTC();

  const streakList: StreakInfo[] = [];

  const history = habit.history;

  const habitType: HabitType = habit.type;

  let unit: keyof DurationObjectUnits;
  let timeStep: DurationInput;
  switch (habitType) {
    case HabitType.DAILY:
      unit = 'day';
      timeStep = { days: 1 };
      break;
    case HabitType.WEEKLY:
      unit = 'week';
      timeStep = { weeks: 1 };
      break;
    case HabitType.MONTHLY:
      unit = 'month';
      timeStep = { months: 1 };
      break;

    default:
      // Make sure all the HabitType cases are covered
      const _exhaustiveCheck: never = habitType;
      return _exhaustiveCheck;
  }

  const startDate = DateTime.fromISO(habit.creationDate.toISOString()).toUTC();
  const todayDate = DateTime.now().toUTC();

  let date = startDate.startOf(unit);
  let i = 0;
  while (date <= todayDate && i < history.length) {
    let streakInfoStartDate = date;
    let length = 0;
    let value = 0;

    let stillContiguous: boolean = true;
    while (stillContiguous && i < history.length) {
      const currentHistoryEntry = history[i];

      // let stillHasSame: boolean = true;
      let completed: boolean = false;
      stillContiguous = extractDate(currentHistoryEntry).hasSame(date, unit);
      if (stillContiguous) {
        length++;
        completed = currentHistoryEntry.type === HistoryEntryType.COMPLETED;
        if (completed) {
          value++;
        }
        i++;
      }

      date = date.plus(timeStep);
    }

    if (value > 0) {
      const streakInfo: StreakInfo = {
        startDate: streakInfoStartDate,
        length: length,
        value: value,         // TODO maybe rename to something more meaningful, for example 'score' or 'lengthWithoutSkip'
        type: habitType,
      };
      streakList.push(streakInfo);
    }
  }

  return streakList;
}



function getBestAndCurrentStreakLength(habit: Habit): { bestStreakLength: number, currentStreakLength: number } {

  // Calculate streak list for this habit
  const streakList: StreakInfo[] = getStreakList(habit);

  // Before parsing the streak list, or if it is empty, the best and current streak length is 0
  let bestStreakLength = 0;
  let currentStreakLength = 0;
  if (streakList.length > 0) {
    // There is at least a streak

    // Find the best (longest streak) and get its length (more precisely its 'value')
    const bestStreak = streakList.reduce((prev, current) => (prev.value > current.value) ? prev : current, streakList[0]);
    bestStreakLength = bestStreak.value;

    // Calculate the value of the current streak

    // Get the last streak
    const lastStreak = streakList[streakList.length-1];

    // Calculate habit type depending variables useful for the next computations
    let unit: keyof DurationObjectUnits;
    let streakDuration: DurationInput;
    let timeStep: DurationInput;
    switch (habit.type) {
      case HabitType.DAILY:
        unit = 'day';
        streakDuration = { days: lastStreak.length };
        timeStep = { days: 1 };
        break;
      case HabitType.WEEKLY:
        unit = 'week';
        streakDuration = { weeks: lastStreak.length };
        timeStep = { weeks: 1 };
        break;
      case HabitType.MONTHLY:
        unit = 'month';
        streakDuration = { months: lastStreak.length };
        timeStep = { months: 1 };
        break;

      default:
        // Make sure all the HabitType cases are covered
        const _exhaustiveCheck: never = habit.type;
        return _exhaustiveCheck;
    }


    const streakEndDate = lastStreak.startDate.plus(streakDuration).minus({ days: 1 });     // calculate streak end date
    const todayDate = DateTime.now().startOf('day');                    // get current date
    const previousPeriodDate = todayDate.minus(timeStep);               // calculate the previous day, week, or month, depending on habit type
    // Check if the last streak in the list of streaks is still active
    // It is considered active if it has been completed or skipped in the current or previous 'period'
    // (day, week, or month, depending on habit type)
    if (streakEndDate.hasSame(todayDate, unit) || streakEndDate.hasSame(previousPeriodDate, unit)) {
      currentStreakLength = lastStreak.value;
    }
  }

  return {
    bestStreakLength: bestStreakLength,
    currentStreakLength: currentStreakLength,
  };
}


function numberOfTimesCompleted(habit: Habit): number {
  const history = habit.history;
  return history.reduce((acc, historyEntry) => acc + ((historyEntry.type === HistoryEntryType.COMPLETED) ? 1 : 0), 0);
}


function numberOfPeriodsSinceCreation(habit: Habit): number {
  const creationDate = DateTime.fromISO(habit.creationDate.toISOString());
  const today = DateTime.fromISO(new Date().toISOString());

  let unit: DurationUnits;
  switch (habit.type) {
    case HabitType.DAILY:
      unit = 'days';
      break;
    case HabitType.WEEKLY:
      unit = 'weeks';
      break;
    case HabitType.MONTHLY:
      unit = 'months';
      break;

    default:
      // Make sure all the HabitType cases are covered
      const _exhaustiveCheck: never = habit.type;
      return _exhaustiveCheck;
  }

  const timeElapsedSinceCreation = today.diff(creationDate);
  const periodsElapsedSinceCreation = Math.ceil(timeElapsedSinceCreation.as(unit));

  return periodsElapsedSinceCreation;
}


/**
 *
 * Stats
 *
 * Sicure
 * Generale
 * - Numero di habit
 * - Numero di habit archiviati
 * - Percentuale completati dall'inizio
 * - Media completati al giorno (Daily average)
 * - Media completati a settimana (Weekly average) ???
 * Per habit
 * - Best/longest streak
 * - Current streak
 * - Numero di volte completato (Total count)
 *
 * Da valutare
 * Generale
 * - Perfect days (giorni in cui si completano tutti gli habit)
 * Per habit
 * - Numero di volte completato nel mese corrente / numero di giorni del mese
 * - Numero di volte completato / numero di giorni da creazione (percentuale (in realtà basta numero di volte completato))
 *
 */




/**
 * Returns the general statistics about the logged in user.
 */
router.get(`/`, auth, async (req, res, next) => {
  try {
    // number of active habits
    const activeHabitCount = await habit.getModel()
      .countDocuments({ userEmail: req.user!.email, archived: false })
      .exec();

    // number of archived habits
    const archivedHabitCount = await habit.getModel()
      .countDocuments({ userEmail: req.user!.email, archived: true })
      .exec();

    // number of times all the active habits has been completed
    const habits = await habit.getModel().find({ userEmail: req.user!.email, archived: false }).exec();
    let completedCount = 0;
    for (let habit of habits) {
      completedCount += numberOfTimesCompleted(habit);
    }

    // percentage of times the habits has been completed
    let totalPeriods = 0;
    for (let habit of habits) {
      totalPeriods += numberOfPeriodsSinceCreation(habit);
    }
    const completedPercentage = completedCount / totalPeriods * 100;

    // Prepare and return the response body
    const body: GetGeneralStatsResponseBody = {
      error: false,
      statusCode: 200,
      stats: {
        activeHabitCount: activeHabitCount,
        archivedHabitCount: archivedHabitCount,
        completedCount: completedCount,
        completedPercentage: completedPercentage,
      }
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // Internal DB error happened
    console.error('Someting went wrong while calculating general statistics', err);
    const errorBody: ErrorResponseBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
});


/**
 * Returns the statistics about the given habit.
 */
router.get(`/:habit_id`, auth, async (req, res, next) => {
  try {
    // Retrieve the habit
    const requestedHabit = await habit.getModel()
      .findOne({ _id: req.params.habit_id, userEmail: req.user!.email })
      .exec();

    if (!requestedHabit) {
      console.warn('User asked the statistics about an unknown habit');
      const errorBody = { error: true, statusCode: 404, errorMessage: 'Unknown habit' };
      return next(errorBody);
    }

    // Calculate stats
    const { bestStreakLength, currentStreakLength } = getBestAndCurrentStreakLength(requestedHabit);
    const completedCount = numberOfTimesCompleted(requestedHabit);

    // percentage of times the habit has been completed
    const completedPercentage = completedCount / numberOfPeriodsSinceCreation(requestedHabit) * 100;

    // Prepare and return the response body
    const body: GetHabitStatsResponseBody = {
      error: false,
      statusCode: 200,
      stats: {
        bestStreak: bestStreakLength,
        currentStreak: currentStreakLength,
        completedCount: completedCount,
        completedPercentage: completedPercentage,
      }
    };
    return res.status(body.statusCode).json(body);
  }
  catch (err) {
    // Internal DB error happened
    console.error('Someting went wrong while calculating statistics for the habit', err);
    const errorBody: ErrorResponseBody = new InternalDbErrorResponseBody();
    return next(errorBody);
  }
});
