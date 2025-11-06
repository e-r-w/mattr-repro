import withPlugin from "./plugins/mattr/withPlugin";

module.exports = {
	name: "mattr-repro",
	slug: "mattr-repro",
	version: "1.0.0",
	orientation: "portrait",
	icon: "./assets/icon.png",
	userInterfaceStyle: "light",
	newArchEnabled: true,
	splash: {
		image: "./assets/splash-icon.png",
		resizeMode: "contain",
		backgroundColor: "#ffffff",
	},
	ios: {
		supportsTablet: true,
	},
	android: {
		adaptiveIcon: {
			foregroundImage: "./assets/adaptive-icon.png",
			backgroundColor: "#ffffff",
		},
		edgeToEdgeEnabled: true,
		predictiveBackGestureEnabled: false,
		package: "com.ethanwilliamsx15.mattrrepro",
	},
	web: {
		favicon: "./assets/favicon.png",
	},
	plugins: [
		"expo-asset",
		"expo-build-properties",
		"expo-font",
		"expo-router",
		"expo-sqlite",
		"expo-web-browser",
		[
			withPlugin,
			{
				mattrDomain: "credentials",
				mattrScheme:
					"io.mattrlabs.sample.reactnativemobilecredentialholdertutorialapp",
			},
		],
	],
};
