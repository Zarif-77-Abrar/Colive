/**
 * Middleware to check if the user is blacklisted.
 * Currently a passthrough until blacklist logic is fully implemented.
 */
const checkBlacklist = (req, res, next) => {
  // Logic to check if req.user.id is blacklisted goes here
  next();
};

export default checkBlacklist;
