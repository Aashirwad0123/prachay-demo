function formatZodError(zodError) {
  const errors = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

// Validates and REPLACES req[part] with the parsed (typed, defaulted) value.
// Schemas should use .strict() where unknown fields must be rejected (mass-assignment protection).
function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return res.status(400).json({ message: 'Validation failed', errors: formatZodError(result.error) });
    }
    req[part] = result.data;
    next();
  };
}

module.exports = validate;
