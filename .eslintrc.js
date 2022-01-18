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
    parserOptions: {
        ecmaVersion: 2021,
        project: "./tsconfig.json",
        sourceType: "module",
    },
    overrides: [
        [["./kernel/**/*.ts"], "./kernel/tsconfig.json"],
        [["./scripts/**/*.ts"], "./scripts/tsconfig.json"],
        [["./task/**/*.ts"], "./task/tsconfig.json"],
        [["./user/**/*.ts"], "./user/tsconfig.json"],
    ].map(([files, project]) => ({
        files,
        parserOptions: {
            ecmaVersion: 2021,
            project,
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
