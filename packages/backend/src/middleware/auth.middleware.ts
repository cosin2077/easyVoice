import { Request, Response, NextFunction } from 'express'

export const auth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV == 'production') {
    return next()
  }
  if (req.headers.authorization === process.env.SWAGGER_AUTH) {
    next()
  } else {
    res.status(403).send('Forbidden')
  }
}
