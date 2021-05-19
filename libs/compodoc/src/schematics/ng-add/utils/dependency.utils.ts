import { Rule } from '@angular-devkit/schematics';
import {
  addDepsToPackageJson,
  readJsonInTree,
  updateJsonInTree,
} from '@nrwl/workspace';

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function filterExistingDependencies(
  requiredDeps: PackageJson['dependencies'] | PackageJson['devDependencies'],
  existingDeps: PackageJson['dependencies'] | PackageJson['devDependencies'],
) {
  return Object.keys(requiredDeps)
    .filter((packageName) => !existingDeps[packageName])
    .reduce(
      (deps, packageName) => ({
        ...deps,
        [packageName]: requiredDeps[packageName],
      }),
      {},
    );
}

export function ensureDependencies({
  dependencies = {},
  devDependencies = {},
}: Partial<Pick<PackageJson, 'dependencies' | 'devDependencies'>>): Rule {
  return (tree) => {
    const packageJson: PackageJson = readJsonInTree(tree, 'package.json');

    const filteredDependencies = filterExistingDependencies(
      dependencies,
      packageJson.dependencies,
    );
    const filteredDevDependencies = filterExistingDependencies(
      devDependencies,
      packageJson.devDependencies,
    );

    const dependencyChanges =
      Object.keys(filteredDependencies).length +
      Object.keys(filteredDevDependencies).length;
    if (dependencyChanges === 0) {
      return;
    }

    return addDepsToPackageJson(filteredDependencies, filteredDevDependencies);
  };
}

export function moveToDevDependencies(packageName: string): Rule {
  return (tree) => {
    const { dependencies }: PackageJson = readJsonInTree(tree, 'package.json');
    if (!dependencies?.[packageName]) {
      return;
    }

    return updateJsonInTree('package.json', (packageJson) => {
      packageJson.dependencies = packageJson.dependencies || {};
      packageJson.devDependencies = packageJson.devDependencies || {};

      packageJson.devDependencies[packageName] =
        packageJson.dependencies[packageName];
      delete packageJson.dependencies[packageName];

      return packageJson;
    });
  };
}
