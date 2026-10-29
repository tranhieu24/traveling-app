import { Router } from 'express';
import { discoveryController } from '../controllers/discovery.controller';
import { optionalAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { listingFilterSchema,uuidParams,destinationQuerySchema } from '../validators/schemas';

const router = Router();

router.get('/destinations', validate(destinationQuerySchema, 'query'), discoveryController.getDestinations);
router.get('/categories', discoveryController.getCategories);
router.get('/amenities', discoveryController.getAmenities);
router.get('/listings', optionalAuth, validate(listingFilterSchema, 'query'), discoveryController.getListings);
router.get('/listings/:id', optionalAuth, validate(uuidParams,'params'), discoveryController.getListingDetail);

export default router;
