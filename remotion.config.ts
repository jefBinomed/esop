import { Config, type WebpackOverrideFn } from "@remotion/cli/config";

export type WebpackConfiguration = Parameters<WebpackOverrideFn>[0];

/**
 * Adapte le bundler Webpack de Remotion à la résolution ESM TypeScript (`NodeNext`),
 * où les imports relatifs portent l'extension `.js` vers des fichiers `.ts` / `.tsx`.
 */
export function applyWebpackExtensionAlias(currentConfiguration: WebpackConfiguration): WebpackConfiguration {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      extensionAlias: {
        ...currentConfiguration.resolve?.extensionAlias,
        ".js": [".ts", ".tsx", ".js", ".jsx"],
      },
    },
  };
}

Config.overrideWebpackConfig(applyWebpackExtensionAlias);
Config.setDelayRenderTimeoutInMilliseconds(180_000);
