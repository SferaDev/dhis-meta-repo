/** @format */

module.exports = {
    env: {
        node: true,
        commonjs: true,
        es6: true,
    },
    extends: ["prettier", "eslint:recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
        "no-console": "off",
        "@typescript-eslint/camelcase": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/member-delimiter-style": "off",
        "@typescript-eslint/type-annotation-spacing": "off",
        "no-extra-semi": "off",
        "no-mixed-spaces-and-tabs": "off",
    },
    plugins: ["@typescript-eslint"],
};
