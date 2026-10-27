import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, AppError } from '../types';
import { categoryRepository } from '../repositories/category.repository';
import { amenityRepository } from '../repositories/amenity.repository';
import { listingRepository } from '../repositories/listing.repository';

export class DiscoveryController {
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
      const queryParams = req.query as any;
      const result = await listingRepository.findListings({
        categoryId: queryParams.categoryId,
        region: queryParams.region,
        city: queryParams.city,
        minPrice: queryParams.minPrice ? parseFloat(queryParams.minPrice) : undefined,
        maxPrice: queryParams.maxPrice ? parseFloat(queryParams.maxPrice) : undefined,
        guests: queryParams.guests ? parseInt(queryParams.guests, 10) : undefined,
        bedrooms: queryParams.bedrooms ? parseInt(queryParams.bedrooms, 10) : undefined,
        beds: queryParams.beds ? parseInt(queryParams.beds, 10) : undefined,
        bathrooms: queryParams.bathrooms ? parseInt(queryParams.bathrooms, 10) : undefined,
        amenityIds: queryParams.amenityIds
          ? Array.isArray(queryParams.amenityIds)
            ? queryParams.amenityIds
            : [queryParams.amenityIds]
          : undefined,
        checkIn: queryParams.checkIn,
        checkOut: queryParams.checkOut,
        page: queryParams.page ? parseInt(queryParams.page, 10) : 1,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : 12,
        sortBy: queryParams.sortBy || 'recommended',
        userId: req.user?.id,
      });

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
