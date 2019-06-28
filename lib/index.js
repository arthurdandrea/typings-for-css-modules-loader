"use strict";

var _cssLoader = _interopRequireDefault(require("css-loader"));

var _loaderUtils = _interopRequireDefault(require("loader-utils"));

var _cssModuleToInterface = require("./cssModuleToInterface");

var persist = _interopRequireWildcard(require("./persist"));

var _logger = _interopRequireDefault(require("./logger"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function normalizeOptions(ctx) {
  const options = _loaderUtils.default.getOptions(ctx) || {};
  const newOptions = { ...options
  };
  delete newOptions.namedExport;
  return newOptions;
}

function delegateToCssLoader(ctx, input, callback) {
  const options = normalizeOptions(ctx);

  _cssLoader.default.call({ ...ctx,
    query: options,
    async: () => callback
  }, ...input);
}

function cssLocalsLoader(...input) {
  const options = normalizeOptions(this);

  _cssLoader.default.call({ ...this,
    query: { ...options,
      onlyLocals: true
    }
  }, ...input);
}

module.exports = function (...input) {
  if (this.cacheable) this.cacheable(); // mock async step 1 - css loader is async, we need to intercept this so we get async ourselves

  const callback = this.async();
  const query = _loaderUtils.default.getOptions(this) || {};
  const logger = (0, _logger.default)(query.silent);

  if (!query.modules) {
    logger('warn', 'Typings for CSS-Modules: option `modules` is not active - skipping extraction work...');
    return delegateToCssLoader(this, input, callback);
  } // mock async step 2 - offer css loader a "fake" callback


  this.async = () => (err, content) => {
    if (err) {
      return callback(err);
    }

    const filename = this.resourcePath;
    const cssModuleInterfaceFilename = (0, _cssModuleToInterface.filenameToTypingsFilename)(filename);
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
      cssModuleDefinition = (0, _cssModuleToInterface.generateGenericExportInterface)(cssModuleKeys, filename);
    } else {
      const [cleanedDefinitions, skippedDefinitions] = (0, _cssModuleToInterface.filterNonWordClasses)(cssModuleKeys);

      if (skippedDefinitions.length > 0 && query.localsConvention !== 'camelCase') {
        logger('warn', `Typings for CSS-Modules: option 'namedExport' was set but option 'localsConvention' is not 'camelCase' for the css-loader.
The following classes will not be available as named exports:
${skippedDefinitions.map(sd => ` - "${sd}"`).join('\n')}
`);
      }

      const [nonReservedWordDefinitions, reservedWordDefinitions] = (0, _cssModuleToInterface.filterReservedWordClasses)(cleanedDefinitions);

      if (reservedWordDefinitions.length > 0) {
        logger('warn', `Your css contains classes which are reserved words in JavaScript.
Consequently the following classes will not be available as named exports:
${reservedWordDefinitions.map(rwd => ` - "${rwd}"`).join('\n')}
These can be accessed using the object literal syntax; eg styles['delete'] instead of styles.delete.
`);
      }

      cssModuleDefinition = (0, _cssModuleToInterface.generateNamedExports)(nonReservedWordDefinitions);
    }

    if (cssModuleDefinition.trim() === '') {
      // Ensure empty CSS modules export something
      cssModuleDefinition = 'export {};\n';
    }

    if (query.banner) {
      // Prefix banner to CSS module
      cssModuleDefinition = query.banner + '\n' + cssModuleDefinition;
    }

    persist.writeToFileIfChanged(cssModuleInterfaceFilename, cssModuleDefinition); // mock async step 3 - make `async` return the actual callback again before calling the 'real' css-loader

    delegateToCssLoader(this, input, callback);
  };

  cssLocalsLoader.call(this, ...input);
};