import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
    {
        files: ["src/**/*.ts"],
        ignores: ["**/out/**", "**/dist/**", "**/*.d.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 6,
            sourceType: "module",
        },
        rules: {
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],
            "semi": ["warn", "always"], // Use the core ESLint semi rule
            curly: "warn",
            eqeqeq: "warn",
            "no-throw-literal": "warn",
        },
    },
    {
        // Previously built JavaScript files under the out directory were getting linted. This configuration
        // will prevent that from happening.
        files: ["**/*.js"],
        ignores: ["**/out/**", "**/dist/**"],
        rules: {
            // Disable all rules for JavaScript files
            "semi": "off",
            "curly": "off",
            "eqeqeq": "off",
            "no-throw-literal": "off",
            "@typescript-eslint/naming-convention": "off",
        },
    }
];