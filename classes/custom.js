const { Classes } = require('template.api');
const { API, SecuredAPI } = Classes();

class Custom extends SecuredAPI {
    constructor(...args) {
        super(...args);
    }

    async get() {
        return { w: 'hello' };
    }

    async set() {
        throw { w: 'hello' };
    }

    async err() {
        throw { w: 'hello' };
    }
}

module.exports = {
    Custom
}