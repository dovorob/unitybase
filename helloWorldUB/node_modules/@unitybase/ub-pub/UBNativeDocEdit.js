/*
 @author v.orel
 */
var UBNativeMessage = require('./UBNativeMessage')

/**
 * Document edit support for UnityBase. Require native messages feature 'docedit' to be installed.
 * @class UBNativeDocEdit
 * @param {Object} [config] initial parameters
 * @param {Number} [config.waitTimeout=180000] Default timeout for  operation (in ms)
 */
function UBNativeDocEdit (config) {
  var
    docedit = Object.create(UBNativeDocEdit.prototype),
    nm,
    initialized = false

  nm = new UBNativeMessage('docedit')
    /**
     * Native messages plugin instance
     * @property {UBNativeMessage} plugin
     * @protected
     */
  docedit.nm = nm
  docedit.nm.callTimeOut = (config && config.waitTimeout) || 180000

    /**
     * Initialize
     * @return {Promise<UBNativeDocEdit>} resolved to self
     */
  docedit.init = function () {
    if (initialized) {
      return Promise.resolve(docedit)
    } else {
      return nm.connect().then(function () {
        initialized = true
        return docedit
      })
    }
  }

    /**
     * Do edit selected document
     * @param {String} path
     * @return {Promise}
     */
  docedit.editDocument = function (path) {
    return nm.invoke('editDocument', path)
  }

  return docedit
}

module.exports = UBNativeDocEdit
