module.exports = {
    presets: ["@babel/typescript", "@babel/preset-env"],
    plugins: [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-object-rest-spread",
        "@babel/plugin-transform-runtime",
    ],
};
