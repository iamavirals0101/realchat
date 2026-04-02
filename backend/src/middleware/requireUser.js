export function requireUser(req, res, next) {
  const userId = req.header("x-user-id") || req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required (x-user-id header or query param)." });
  }
  req.userId = userId;
  next();
}
