var me = ubs_settings;

function convertBoolean(value, settingKey) {
    if (value === 'true' ) return true;
    if (value === 'false') return false;
    console.error('Unknown value: ', value, 'for boolean key ', settingKey);
    return value;
}

function convert(type, value, settingKey) {
    switch (type.toUpperCase ? type.toUpperCase() : type) {
        case 'BOOLEAN':
            return convertBoolean(value, settingKey);
        case 'STRING':
        case 'INT':
            return value;
        default :
            console.error('Unknown type:', type, 'for key:', settingKey);
            return value;
    }
}

/**
 * Load a single configuration value.
 * @param {string} settingKey
 * @param {String|Boolean|Number|null} [defaultValue=null] The value returned if setting key not fount
 * @returns {null|number|string|boolean}
 */
me.loadKey = function loadKey(settingKey, defaultValue = null) {

    var store = UB.Repository('ubs_settings')
        .attrs(['ID', 'type', 'settingKey', 'settingValue'])
        .where('[settingKey]', '=', settingKey)
        .select();

    if (store.eof) {
        console.warn('There is no setting with key:' + settingKey);
        return defaultValue;
    }

    var res = convert(store.get('type'), store.get('settingValue'), settingKey);

    store.next();
    if (!store.eof)
        console.error('There is more than one settings with key: ' + settingKey);

    return res;
};

/**
 * Load a configuration object for number of keys.
 * @param {Array<string>|string} settingKeys   A mask or array of keys.
 * @returns {object}
 */
me.loadKeys = function loadKeys(settingKeys) {

    var store = UB.Repository('ubs_settings')
        .attrs(['ID', 'type', 'settingKey', 'settingValue'])
         .where('[settingKey]', typeof settingKeys === 'string' ? 'startsWith' : 'in', settingKeys)
        .select();

    const configObject = {};
    for (; !store.eof; store.next()) {
        const settingKey = store.get('settingKey');
        configObject[settingKey] = convert(store.get('type'), store.get('settingValue'), settingKey);
    }

    return configObject;
};

/**
 * Alias for a loadKey (for compatibility with 1.11)
 *
 * @param {String} settingKey
 * @param {String|Boolean|Number|null} [defaultValue=null] The value returned if setting key not fount
 * @returns {String|Boolean|Number|null}
 */
me.getSettingValue = me.loadKey;