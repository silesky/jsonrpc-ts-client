/** @type { import('eslint').Linter.BaseConfig } */
module.exports = {
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  ignorePatterns: ["node_modules", "dist"],
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
        ecmaVersion: 2020,
        sourceType: "module",
      },
      plugins: ["@typescript-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/errors",
        "plugin:import/typescript",
        "plugin:prettier/recommended",
      ],
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/restrict-template-expressions": [
          2,
          {
            allowBoolean: true,
            allowAny: true,
          },
        ],
        "no-case-declarations": 0,
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            vars: "all",
            args: "after-used",
            ignoreRestSiblings: false,
            argsIgnorePattern: "^_", // don't require _foo to be used if in an argument list.
          },
        ],
        "@typescript-eslint/naming-convention": [
          "error",
          {
            selector: "typeLike",
            format: ["PascalCase"], // Types should always be PascalCase
          },
        ],
      },
    },
    {
      files: "*.js", // do not use typescript eslint
      extends: [
        "eslint:recommended",
        "plugin:import/errors",
        "plugin:prettier/recommended",
      ],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
  ],
};
