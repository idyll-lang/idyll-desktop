const electron = require('electron');
const fs = require('fs');
const path = require('path');
const error = require('../../error');

// Reference: https://github.com/ccnokes/electron-tutorials/blob/master/storing-data/store.js

class DataStore {
  constructor(
    defaultData = {
      tokenUrls: [],
      lastOpenedProject: { filePath: null, lastOpened: null }
    }
  ) {
    const userDataPath = (electron.app || electron.remote.app).getPath(
      'userData'
    );

    this.path = path.join(userDataPath, 'project-data.json');
    try {
      this.data = JSON.parse(fs.readFileSync(this.path));
    } catch (error) {
      console.log(error, 'Creating a new store...');
      this.data = defaultData;
      updateFile(this.path, JSON.stringify(this.data));
    }
  }

  /**
   * Returns a {token: url} pair from the project.
   * If the token/url pair does not exist in the file,
   * returns null
   * @param {string} inputToken the .idyll token contents
   */
  getTokenUrlByToken(inputToken) {
    checkParams(inputToken, 'inputToken');

    const tokenUrl = this.data['tokenUrls'].filter(
      tokenUrlMap => tokenUrlMap.token === inputToken
    )[0];

    return tokenUrl ? { ...tokenUrl } : null;
  }

  /**
   * Gets the last opened session's project file path.
   * Returns null if no project has been opened before.
   * Otherwise returns a string path
   */
  getLastSessionProjectPath() {
    const lastProject = this.data.lastOpenedProject['filePath'];
    return lastProject ? lastProject : null;
  }

  /**
   * Updates the file with the {token: url}
   * @param {string} url the publishing url
   * @param {string} token the corresponding token string
   */
  addTokenUrlPair(url, token) {
    checkParams(url, 'url');
    checkParams(token, 'token');

    const existingToken = this.getTokenUrlByToken(token);

    if (!existingToken) {
      // get deep copy of tokenUrl array
      const tokenUrls = getDeepCopyOfTokenUrls(this.data.tokenUrls);
      tokenUrls.push({ token: token, url: url });

      // get copy of last session info
      const lastOpened = { ...this.data.lastOpenedProject };

      const dataClone = { tokenUrls: tokenUrls, lastOpenedProject: lastOpened };
      this.data = dataClone;

      // serialize data back to file
      updateFile(this.path, JSON.stringify(this.data));
    }
  }

  /**
   * Updates the file and stores the last session's
   * project path with the date / time it was opened
   * @param {string} projectPath
   */
  updateLastOpenedProject(projectPath) {
    checkParams(projectPath, 'projectPath');

    const tokenUrls = getDeepCopyOfTokenUrls(this.data.tokenUrls);
    const lastOpenedProject = { filePath: projectPath, lastOpened: Date.now() };

    const dataClone = {
      tokenUrls: tokenUrls,
      lastOpenedProject: lastOpenedProject
    };

    this.data = dataClone;

    updateFile(this.path, JSON.stringify(this.data));
  }
}

/**
 * Updates the data store file with the current data
 * @param {string} path the file path for the project
 * @param {string} contents the data contents
 */
function updateFile(path, contents) {
  try {
    // console.log('Updating file...', contents);
    fs.writeFileSync(path, contents);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Returns a deep copy of the tokenUrl list
 * @param {string} tokenUrls the list of tokenUrl objects
 */
function getDeepCopyOfTokenUrls(tokenUrls) {
  return tokenUrls.map(tokenUrl => ({
    ...tokenUrl
  }));
}

function checkParams(input, inputName) {
  if (!input) {
    throw new error.InvalidParameterError(
      inputName + ' must not be null or undefined'
    );
  }
}

module.exports = DataStore;
