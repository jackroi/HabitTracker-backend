/**
 * Habits endpoints.
 */


import express from 'express';

import auth from '../middlewares/auth'


const router = express.Router();
export default router;


/**
* Returns the list of habits of the logged in user.
*/
router.get(`/`, auth, (req, res, next) => {
});






// app.route('/habits').get(auth, async (req, res, next) => {
//   let { filter, skip, limit } = req.query;

//   // filter for mongodb query
//   const queryFilter: { userEmail: string, archived?: boolean } = {
//     userEmail: req.user!.email,
//   };

//   // filter param validation
//   filter = filter || 'not_archived';
//   if (filter === 'archived') {
//     queryFilter.archived = true;
//   } else if (filter === 'not_archived') {
//     queryFilter.archived = false;
//   } else if (filter === 'all') {
//     // do nothing
//   } else {
//     // filter has an invalid value
//     console.warn('Invalid query param "filter"');
//     queryFilter.archived = false;     // use default
//   }

//   // skip and limit params validation
//   let skipNumber: number = parseInt(skip as string || '0') || 0;
//   let limitNumber: number = parseInt(limit as string || '50') || 50;

//   const habits = await habit.getModel()
//     .find(queryFilter, { userEmail: 0, __v: 0 })
//     .skip(skipNumber)
//     .limit(limitNumber);

//   const returnedHabits = habits.map((habit) => ({
//     id: habit._id,
//     name: habit.name,
//     creationDate: habit.creationDate,
//     category: habit.category,
//     archived: habit.archived,
//   }));

//   res.status(200).json({
//     statusCode: 200,
//     error: false,
//     habits: returnedHabits,
//   });
// })
// .post(auth, (req, res, next) => {
//   const newHabit = {
//     name: req.body.name,
//     category: req.body.category,
//     creationDate: new Date(),
//     archived: false,
//     userEmail: req.user!.email,
//   };
// });
