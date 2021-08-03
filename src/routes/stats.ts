/**
 * Statistics endpoints.
 */


import express from 'express';

import auth from '../middlewares/auth'

import * as habit from '../models/Habit';
import { Habit } from '../models/Habit';


const router = express.Router();
export default router;


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

  // number of active habits
  const activeHabitCount = await habit.getModel()
    .countDocuments({ userEmail: req.user!.email, archived: false })
    .exec();

  // number of archived habits
  const archivedHabitCount = await habit.getModel()
    .countDocuments({ userEmail: req.user!.email, archived: true })
    .exec();

  // number of times all the habits has been completed
  // TODO memorizzato in tabella stats
  // TODO +1 ogni volta che completo un daily habit
  // TODO +1 ogni volta che completo un weekly habit
  // TODO +1 ogni volta che completo un monthly habit
  // TODO -1 ogni volta che viene eliminato/skippato uno dei precedenti


});


/**
 * Returns the statistics about the given habit.
 */
router.get(`/:habit_id`, auth, async (req, res, next) => {

  function calculateCurrentStreak(habit: Habit) {
    const creationDate = habit.creationDate;
    const currentDate = new Date();
    const history = habit.history;


    for (let i = history.length; i >= 0; i--) {

    }
  }
});
