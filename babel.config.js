// NOTE: Do not add `react-native-worklets/plugin` here. As of SDK 56,
// `babel-preset-expo` adds it automatically when react-native-worklets is
// installed; adding it again throws "Babel plugin exists more than once".
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
