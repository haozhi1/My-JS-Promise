const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    test: path.resolve(__dirname, "lib/index.ts"),
  },
  resolve: {
    extensions: [".ts"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: path.resolve(__dirname, "node_modules"),
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
    library: {
      name: "MyPromise",
      type: "var",
    },
  },
};