module.exports = {
  webpack: (config, options, webpack) => {
    config.entry.main = ["babel-polyfill", "./src/index.ts"];

    config.resolve = {
      extensions: [".ts", ".js", ".json"]
    };

    config.module.rules.push({
      test: /\.ts$/,
      loader: "babel-loader"
    });

    return config;
  }
};
