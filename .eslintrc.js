const ignoreNodeGlobal = {
  "no-restricted-globals": [
    "error",
    "process",
    "Buffer",
    "__filename",
    "__dirname",
    "require",
    "module",
    "exports",
  ],
};

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
    [["./libnode/**/*.ts"], "./libnode/tsconfig.json", ignoreNodeGlobal],
    [["./scripts/**/*.ts"], "./scripts/tsconfig.json"],
    [["./service/**/*.ts"], "./service/tsconfig.json", ignoreNodeGlobal],
    [["./shared/**/*.ts"], "./shared/tsconfig.json", ignoreNodeGlobal],
    [["./user/**/*.ts"], "./user/tsconfig.json"],
    [["./window/**/*.ts"], "./window/tsconfig.json", ignoreNodeGlobal],
    [["./worker/**/*.ts"], "./worker/tsconfig.json", ignoreNodeGlobal],
  ].map(([files, project, rules]) => ({
    files,
    parserOptions: {
      ecmaVersion: 2021,
      project,
      sourceType: "module",
    },
    rules,
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
