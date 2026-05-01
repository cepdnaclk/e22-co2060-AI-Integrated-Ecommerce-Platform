function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    details: err.details || undefined
  });
}

module.exports = errorHandler;
