import cssLoader from 'css-loader';
import loaderUtils from 'loader-utils';

import {
  filterNonWordClasses,
  filterReservedWordClasses,
  generateNamedExports,
  generateGenericExportInterface,
  filenameToTypingsFilename,
} from './cssModuleToInterface';
import * as persist from './persist';
import loggerCreator from './logger';

function normalizeOptions(ctx) {
  const options = loaderUtils.getOptions(ctx) || {};
  const newOptions = {...options};
  delete newOptions.namedExport;
  return newOptions;
}

function delegateToCssLoader(ctx, input, callback) {
  const options = normalizeOptions(ctx);
  cssLoader.call({ ...ctx, query: options, async: () => callback }, ...input);
}

function cssLocalsLoader(...input) {
  const options = normalizeOptions(this);
  cssLoader.call({ ...this, query: { ...options, onlyLocals: true }}, ...input);
}

module.exports = function(...input) {
  if(this.cacheable) this.cacheable();

  // mock async step 1 - css loader is async, we need to intercept this so we get async ourselves
  const callback = this.async();

  const query = loaderUtils.getOptions(this) || {};
  const logger = loggerCreator(query.silent);

  if (!query.modules) {
    logger('warn','Typings for CSS-Modules: option `modules` is not active - skipping extraction work...');
    return delegateToCssLoader(this, input, callback);
  }

  // mock async step 2 - offer css loader a "fake" callback
  this.async = () => (err, content) => {
    if (err) {
      return callback(err);
    }
    const filename = this.resourcePath;
    const cssModuleInterfaceFilename = filenameToTypingsFilename(filename);

    const keyRegex = /"([^\\"]+)":/g;
    let match;
    const cssModuleKeys = [];

    while (match = keyRegex.exec(content)) {
      if (cssModuleKeys.indexOf(match[1]) < 0) {
        cssModuleKeys.push(match[1]);
      }
    }

    let cssModuleDefinition;
    if (!query.namedExport) {
      cssModuleDefinition = generateGenericExportInterface(cssModuleKeys, filename);
    } else {
      const [cleanedDefinitions, skippedDefinitions] = filterNonWordClasses(cssModuleKeys);
      if (skippedDefinitions.length > 0 && query.localsConvention !== 'camelCase') {
        logger('warn', `Typings for CSS-Modules: option 'namedExport' was set but option 'localsConvention' is not 'camelCase' for the css-loader.
The following classes will not be available as named exports:
${skippedDefinitions.map(sd => ` - "${sd}"`).join('\n')}
`);
      }

      const [nonReservedWordDefinitions, reservedWordDefinitions] = filterReservedWordClasses(cleanedDefinitions);
      if (reservedWordDefinitions.length > 0) {
        logger('warn', `Your css contains classes which are reserved words in JavaScript.
Consequently the following classes will not be available as named exports:
${reservedWordDefinitions.map(rwd => ` - "${rwd}"`).join('\n')}
These can be accessed using the object literal syntax; eg styles['delete'] instead of styles.delete.
`);
      }

      cssModuleDefinition = generateNamedExports(nonReservedWordDefinitions);
    }
    if (cssModuleDefinition.trim() === '') {
      // Ensure empty CSS modules export something
      cssModuleDefinition = 'export {};\n';
    }
    if (query.banner) {
      // Prefix banner to CSS module
      cssModuleDefinition = query.banner + '\n' + cssModuleDefinition;
    }
    persist.writeToFileIfChanged(cssModuleInterfaceFilename, cssModuleDefinition);
    // mock async step 3 - make `async` return the actual callback again before calling the 'real' css-loader
    delegateToCssLoader(this, input, callback);
  };
  cssLocalsLoader.call(this, ...input);
};
