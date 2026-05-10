export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const payload = {
    message: err.message || 'Server error'
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  if (err.name === 'CastError') {
    res.status(404);
    payload.message = 'Resource not found';
  }

  if (err.code === 11000) {
    res.status(409);
    payload.message = 'Duplicate field value';
  }

  res.status(statusCode).json(payload);
};
