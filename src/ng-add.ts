import {
  SchematicsException,
  Tree,
  SchematicContext
} from '@angular-devkit/schematics';
import { experimental, JsonParseMode, parseJson } from '@angular-devkit/core';
import fs from 'fs';
import path from 'path';

const APP_YAML = 'app.yaml';

function getWorkspace(
  host: Tree
): { path: string; workspace: experimental.workspace.WorkspaceSchema } {
  const possibleFiles = ['/angular.json', '/.angular.json'];
  const path = possibleFiles.filter(path => host.exists(path))[0];

  const configBuffer = host.read(path);
  if (configBuffer === null) {
    throw new SchematicsException(`Could not find angular.json`);
  }
  const content = configBuffer.toString();

  let workspace: experimental.workspace.WorkspaceSchema;
  try {
    workspace = (parseJson(
      content,
      JsonParseMode.Loose
    ) as {}) as experimental.workspace.WorkspaceSchema;
  } catch (e) {
    throw new SchematicsException(`Could not parse angular.json: ` + e.message);
  }

  return {
    path,
    workspace
  };
}
interface NgAddOptions {
  project: string;
}

export const ngAdd = (options: NgAddOptions) => (
  tree: Tree,
  _context: SchematicContext
) => {
  const { path: workspacePath, workspace } = getWorkspace(tree);

  if (!options.project) {
    if (workspace.defaultProject) {
      options.project = workspace.defaultProject;
    } else {
      throw new SchematicsException(
        'No Angular project selected and no default project in the workspace'
      );
    }
  }

  const project = workspace.projects[options.project];
  if (!project) {
    throw new SchematicsException(
      'The specified Angular project is not defined in this workspace'
    );
  }

  if (project.projectType !== 'application') {
    throw new SchematicsException(
      `Deploy requires an Angular project type of "application" in angular.json`
    );
  }

  if (
    !project.architect ||
    !project.architect.build ||
    !project.architect.build.options ||
    !project.architect.build.options.outputPath
  ) {
    throw new SchematicsException(
      `Cannot read the output path (architect.build.options.outputPath) of the Angular project "${options.project}" in angular.json`
    );
  }

  project.architect['deploy'] = {
    builder: '@wagnermaciel/gcp-deploy:deploy',
    options: {}
  };

  if (!tree.exists(APP_YAML)) {
    try {
      const absolutePath = path.resolve(__dirname, APP_YAML);
      const content = fs.readFileSync(absolutePath);
      tree.create(APP_YAML, content);
    } catch (e) {
      throw new SchematicsException(`Could not create app.yaml: ` + e.message);
    }
  }

  tree.overwrite(workspacePath, JSON.stringify(workspace, null, 2));
  return tree;
};
