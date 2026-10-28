import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, AppError } from '../types';
import { favoriteRepository } from '../repositories/favorite.repository';
import { reviewRepository } from '../repositories/review.repository';

export class InteractionController {
  async getFavorites(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const favorites = await favoriteRepository.getUserFavorites(req.user.id,Number(req.query.page),Number(req.query.limit));
      return sendSuccess(res, favorites.items,200,favorites.pagination);
    } catch (error) {
      next(error);
    }
  }

  async toggleFavorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const { listingId } = req.body;
      const isFavorite = await favoriteRepository.toggleFavorite(req.user.id, listingId);
      return sendSuccess(res, { listingId, isFavorite });
    } catch (error) {
      next(error);
    }
  }

  async getListingReviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await reviewRepository.getByListingId(id, page, limit);
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

  async createReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const { id: listingId } = req.params;
      const { rating, comment } = req.body;

      const newReview = await reviewRepository.createReview({
        listingId,
        userId: req.user.id,
        rating,
        comment,
      });

      return sendSuccess(res, newReview, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const interactionController = new InteractionController();
