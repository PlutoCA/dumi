import type { IApi } from '@/types';
import type { AssetsPackage, AtomAsset, ExampleAsset } from 'dumi-assets-types';
import fs from 'fs';
import path from 'path';
import { lodash } from 'umi/plugin-utils';

const examples: ExampleAsset[] = [];
const atomsMeta: Record<string, Partial<AtomAsset>> = {};

/**
 * internal function to add example assets
 */
export function addExampleAssets(data: typeof examples) {
  examples.push(...data);
}

/**
 * internal function to get atom assets
 */
export function getExampleAssets() {
  return examples;
}

/**
 * internal function to add meta for atom
 */
export function addAtomMeta(atomId: string, data: Partial<AtomAsset>) {
  atomsMeta[atomId] = lodash.pick(data, ['title', 'keywords', 'deprecated']);
}

/**
 * plugin for generate assets.json
 */
export default (api: IApi) => {
  api.describe({
    config: {
      schema: (Joi) => Joi.object(),
    },
    enableBy: ({ env }) => env === 'production' && Boolean(api.args.assets),
  });

  api.onBuildComplete(async () => {
    const { components } = api.service.atomParser
      ? await api.service.atomParser.parse()
      : // allow generate assets.json without atoms when parser is not available
        { components: {} };
    const assets = await api.applyPlugins({
      key: 'modifyAssetsMetadata',
      initialValue: {
        name: api.config.themeConfig.title || api.pkg.name,
        npmPackageName: api.pkg.name,
        version: api.pkg.version,
        description: api.pkg.description,
        logo: api.config.themeConfig.logo,
        homepage: api.pkg.homepage,
        repository: api.pkg.repository,
        assets: {
          atoms: Object.values(components).map((atom) =>
            // assign extra meta data from md frontmatter
            Object.assign(atom, atomsMeta[atom.id] || {}),
          ),
          examples: lodash.uniqBy(examples, 'id'),
        },
      } as AssetsPackage,
    });

    fs.writeFileSync(
      path.join(api.cwd, 'assets.json'),
      JSON.stringify(assets, null, 2),
      'utf-8',
    );
  });
};
