function validate(schema, source = "body") {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues
      });
    }
    req[source] = parsed.data;
    return next();
  };
}

module.exports = validate;
