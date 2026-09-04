// Structured request logging. Never logs headers, body, or query params -
// only method/route/status/duration/requestId, so tokens and passwords can't leak here.
module.exports = function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: req.id,
        method: req.method,
        route: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Date.now() - start,
      })
    );
  });
  next();
};
