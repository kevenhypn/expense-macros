module.exports = ({ config }) => {
  const baseUrl = process.env.EXPENSE_MACROS_BASE_PATH;
  if (!baseUrl) return config;
  if (!/^\/(?:[\w.-]+\/)*[\w.-]+$/.test(baseUrl)) {
    throw new Error("EXPENSE_MACROS_BASE_PATH must be a path such as /expense-macros.");
  }
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
