import type { Request, Response } from 'express';
import { fetchWeather } from '../services/weather.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

export const weatherController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    const weather = await fetchWeather(latitude, longitude);
    if (!weather) {
      // Never crash the page: degrade to a friendly message.
      res.status(200).json(new ApiResponse('Weather unavailable.', null));
      return;
    }

    res.status(200).json(new ApiResponse('Weather fetched successfully', weather));
  }),
};
