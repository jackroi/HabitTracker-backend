/**
 * Statistics endpoints.
 */


import express from 'express';

import auth from '../middlewares/auth'


const router = express.Router();
export default router;


 /**
  * Returns the general statistics about the logged in user.
  */
router.get(`/`, auth, (req, res, next) => {
});
