import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as Controller from '../controllers/eventFeedback.controller.js';

const router = express.Router();

// User routes
router.post('/', authenticate, Controller.createFeedback);
router.put('/:id', authenticate, Controller.updateFeedback);
router.get('/my-feedback', authenticate, Controller.getUserFeedback);

// FIX (frontend project): any logged-in user can read an event's feedback so the event page
// can show the reviews + average rating. Emails are stripped for non-admins in the controller.
router.get('/event/:event_id', authenticate, Controller.getEventFeedback);

export default router;
