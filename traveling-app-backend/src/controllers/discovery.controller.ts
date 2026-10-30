import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, AppError } from '../types';
import { categoryRepository } from '../repositories/category.repository';
import { amenityRepository } from '../repositories/amenity.repository';
import { listingRepository } from '../repositories/listing.repository';
import { destinationRepository } from '../repositories/destination.repository';

export class DiscoveryController {
  async getDestinations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { return sendSuccess(res, await destinationRepository.search(String(req.query.q), Number(req.query.limit))); }
    catch (error) { next(error); }
  }

  async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categories = await categoryRepository.getAll();
      return sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async getAmenities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const amenities = await amenityRepository.getAll();
      return sendSuccess(res, amenities);
    } catch (error) {
      next(error);
    }
  }

  async getListings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await listingRepository.findListings({...req.query as any,userId:req.user?.id});

      return sendSuccess(res, result.items, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  }

  async getListingDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const listing = await listingRepository.getListingById(id, req.user?.id);
      if (!listing) {
        throw new AppError('Listing not found', 404, 'NOT_FOUND');
      }
      return sendSuccess(res, listing);
    } catch (error) {
      next(error);
    }
  }
}

export const discoveryController = new DiscoveryController();
