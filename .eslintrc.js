// @ts-check

/**@type {import('eslint').Linter.Config}*/
const config = {
  env: {
    browser: true,
    node: false,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  overrides: [
    ["deno-std", "deno-std/deno_std/**/*.*"],
    ["examples"],
    ["service"],
    ["shared"],
    ["window"],
    ["worker"],
  ].map(([dir, excludedFiles]) => ({
    excludedFiles,
    files: [`./${dir}/**/*.ts`],
    parserOptions: {
      ecmaVersion: 2021,
      project: `./${dir}/tsconfig.json`,
      sourceType: "module",
    },
  })),
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "@typescript-eslint/consistent-type-imports": "warn",
    "@typescript-eslint/lines-between-class-members": "error",
    "@typescript-eslint/member-ordering": "warn",
    "@typescript-eslint/naming-convention": "warn",
    "@typescript-eslint/semi": "warn",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "sort-imports": [
      "warn",
      {
        allowSeparatedGroups: false,
        ignoreCase: false,
        ignoreDeclarationSort: false,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
      },
    ],
  },
};

module.exports = config;
