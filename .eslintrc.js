module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    createDefaultProgram: true,
    project: "./tsconfig.json",
  },
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended", // for js files
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:import/errors", // for catching immediately-executed imports like "import ./foo"
    "plugin:import/warnings",
    "plugin:import/typescript", // disable rules that overlap with typescript
  ],
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "lines-between-class-members": [
      "error",
      "always",
      { exceptAfterSingleLine: true },
    ],
    "import/no-default-export": 2,
    "@typescript-eslint/ban-types": 0,
    "@typescript-eslint/explicit-module-boundary-types": 0,
    "@typescript-eslint/no-empty-interface": 0,
    "@typescript-eslint/promise-function-async": 2,
    "@typescript-eslint/no-floating-promises": [2, { ignoreIIFE: true }],
  },
  overrides: [
    {
      files: ["*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": 0,
      },
    },
    {
      files: ["docs/examples/**/*.ts"],
      rules: {
        "@typescript-eslint/no-var-requires": 0,
        "import/no-unresolved": 0,
      },
    },
  ],
};
