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
    ["libnode", ["./libnode/@types-node/**/*.ts"]],
    ["scripts"],
    ["service"],
    ["shared"],
    ["user"],
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
