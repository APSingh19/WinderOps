export const zodValidate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  });

  if (!result.success) {
    res.status(400);
    return next(new Error(result.error.issues.map((issue) => issue.message).join(', ')));
  }

  req.validated = result.data;
  next();
};
