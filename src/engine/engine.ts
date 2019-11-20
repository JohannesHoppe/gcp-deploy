import { logging } from '@angular-devkit/core';
import * as fse from 'fs-extra';
import { execSync } from 'child_process';

import { Schema } from '../deploy/schema';

export async function run(
  dir: string,
  options: Schema,
  logger: logging.LoggerApi
) {
  try {
    execSync('gcloud app deploy', { stdio: 'inherit' });

    logger.info(
      '🚀 Successfully published to Google Cloud Platform! Have a nice day!'
    );
  } catch (error) {
    logger.error('❌ An error occurred!');
    throw error;
  }
}
