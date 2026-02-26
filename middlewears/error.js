export const errorMiddleware = (err, req, res, next) => {

  err.message ||= "server error";
  err.statusCode ||= 500;

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export const tryCatch = (loginPassedFunction) => async (req, res, next) => {
  try {
    await loginPassedFunction(req, res, next);
  } catch (error) {
    next(error)
  }
};
