import { Router } from 'express';
import { interactionController } from '../controllers/interaction.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { toggleFavoriteSchema, createReviewSchema } from '../validators/schemas';

const router = Router();

// Favorites
router.get('/favorites', requireAuth, interactionController.getFavorites);
router.post('/favorites/toggle', requireAuth, validate(toggleFavoriteSchema, 'body'), interactionController.toggleFavorite);

// Reviews
router.get('/listings/:id/reviews', interactionController.getListingReviews);
router.post('/listings/:id/reviews', requireAuth, validate(createReviewSchema, 'body'), interactionController.createReview);

export default router;
