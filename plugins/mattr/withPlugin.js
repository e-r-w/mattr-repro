const {
	withAndroidManifest,
	withAppBuildGradle,
	withProjectBuildGradle,
} = require("expo/config-plugins");

const withAndroidPlugin = (config, { mattrDomain, mattrScheme }) => {
	if (!mattrDomain || !mattrScheme) {
		throw new Error(
			"[withAndroidHolderSDK] Please provide both 'mattrDomain' and 'mattrScheme' in plugin options.",
		);
	}

	// ───────────────────────────────────────────────────────────────────────────
	// 1) Add a Maven repo pointing at android/frameworks
	// ───────────────────────────────────────────────────────────────────────────
	config = withProjectBuildGradle(config, (params) => {
		let contents = params.modResults.contents;

		// The frameworks folder (with POM + AAR) lives here:

		const mavenRepoLine = `maven { url = "${__dirname}/../../node_modules/@mattrglobal/mobile-credential-holder-react-native/android/frameworks" }`;

		// If we've already injected this exact Maven repo, bail out
		if (contents.includes(mavenRepoLine)) {
			return params;
		}

		// ── 1.a) Under buildscript { repositories { … } }, insert our Maven repo
		//
		// buildscript {
		//   repositories {
		//     google()
		//     mavenCentral()
		//     // MATTR Maven repo
		//     maven { url = ".../android/frameworks" }
		//   }
		//   dependencies { … }
		// }
		const buildscriptRepoRegex =
			/buildscript\s*\{\s*repositories\s*\{([\s\S]*?)\}/m;
		if (buildscriptRepoRegex.test(contents)) {
			contents = contents.replace(buildscriptRepoRegex, (match, innerBlock) => {
				const trimmed = innerBlock.trim();
				return `buildscript {\n  repositories {\n${trimmed}\n    // MATTR Maven repo\n    ${mavenRepoLine}\n  }`;
			});
		} else {
			// Fallback: if somehow buildscript→repositories is missing, append it
			contents += `

buildscript {
  repositories {
    // MATTR Maven repo
    ${mavenRepoLine}
    google()
    mavenCentral()
  }
}`;
		}

		// ── 1.b) Under allprojects { repositories { … } }, insert the same Maven repo
		//
		// allprojects {
		//   repositories {
		//     google()
		//     mavenCentral()
		//     // MATTR Maven repo
		//     maven { url = ".../android/frameworks" }
		//   }
		// }
		const allprojectsRepoRegex =
			/allprojects\s*\{\s*repositories\s*\{([\s\S]*?)\}/m;
		if (allprojectsRepoRegex.test(contents)) {
			contents = contents.replace(allprojectsRepoRegex, (match, innerBlock) => {
				const trimmed = innerBlock.trim();
				return `allprojects {\n  repositories {\n${trimmed}\n    // MATTR Maven repo\n    ${mavenRepoLine}\n  }`;
			});
		} else {
			// Fallback: if somehow allprojects→repositories is missing, append it
			contents += `

allprojects {
  repositories {
    // MATTR Maven repo
    ${mavenRepoLine}
    google()
    mavenCentral()
  }
}`;
		}

		params.modResults.contents = contents;
		return params;
	});

	// ───────────────────────────────────────────────────────────────────────────
	// 2) Add manifestPlaceholders to android/app/build.gradle
	// ───────────────────────────────────────────────────────────────────────────
	config = withAppBuildGradle(config, (params) => {
		// Only proceed if this is Groovy; otherwise, bail
		if (params.modResults.language !== "groovy") {
			return params;
		}

		let contents = params.modResults.contents;

		// If placeholders already exist, do nothing
		const placeholderPattern =
			/manifestPlaceholders\s*=\s*\[\s*mattrDomain:\s*".+?",\s*mattrScheme:\s*".+?"\s*\]/s;
		if (placeholderPattern.test(contents)) {
			return params;
		}

		// Insert placeholders right after `defaultConfig {`
		const defaultConfigRegex = /(defaultConfig\s*\{)/;
		contents = contents.replace(
			defaultConfigRegex,
			`$1
			// MATTR SDK placeholders
			manifestPlaceholders = [
				mattrDomain: "${mattrDomain}",
				mattrScheme: "${mattrScheme}"
			]`,
		);

		params.modResults.contents = contents;

		if (params.modResults.language === "groovy") {
			params.modResults.contents = params.modResults.contents.replace(
				/targetSdkVersion\s+\d+/,
				"targetSdkVersion 35",
			);
			params.modResults.contents = params.modResults.contents.replace(
				/compileSdkVersion\s+\d+/,
				"compileSdkVersion 35",
			);
		}

		return params;
	});

	// ───────────────────────────────────────────────────────────────────────────
	// 3) Remove any “scheme-only” intent-filters from AndroidManifest.xml
	// ───────────────────────────────────────────────────────────────────────────
	config = withAndroidManifest(config, (androidConfig) => {
		const manifest = androidConfig.modResults.manifest;
		const applicationArray = manifest.application || [];

		if (applicationArray.length === 0) {
			// No <application> found—nothing to do
			return androidConfig;
		}

		// We assume there is exactly one <application> node
		const mainApplication = applicationArray[0];
		const activities = mainApplication.activity || [];

		for (const activity of activities) {
			if (!Array.isArray(activity["intent-filter"])) {
				continue;
			}

			// Filter out any intent-filter where a <data> has only our scheme (no host):
			activity["intent-filter"] = activity["intent-filter"].filter(
				(intentFilterNode) => {
					const dataArray = intentFilterNode.data || [];

					// If any <data> node has android:scheme === mattrScheme and no android:host,
					// drop this intent-filter entirely:
					const hasOnlySchemeToDrop = dataArray.some((dataNode) => {
						const attrs = dataNode.$ || {};
						return (
							attrs["android:scheme"] === mattrScheme &&
							!Object.hasOwn(attrs, "android:host")
						);
					});

					// Keep this intent-filter only if it is NOT a "scheme-only" match
					return !hasOnlySchemeToDrop;
				},
			);
		}

		return androidConfig;
	});

	return config;
};

module.exports = withAndroidPlugin;
