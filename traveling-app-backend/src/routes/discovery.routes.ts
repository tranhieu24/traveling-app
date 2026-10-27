import { Router } from 'express';
import { discoveryController } from '../controllers/discovery.controller';
import { optionalAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listingFilterSchema } from '../validators/schemas';

const router = Router();

router.get('/categories', discoveryController.getCategories);
router.get('/amenities', discoveryController.getAmenities);
router.get('/listings', optionalAuth, validate(listingFilterSchema, 'query'), discoveryController.getListings);
router.get('/listings/:id', optionalAuth, discoveryController.getListingDetail);

export default router;
