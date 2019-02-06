const { Classes } = require('template.api');
const { API, SecuredAPI } = Classes();

class Custom extends SecuredAPI {
    constructor(...args) {
        super(...args);
    }

    async get() {
        let shadow = await this.$shadowPayload();
        return { w: 'hello', ...shadow };
    }

    async void() {
        //let shadow = await this.$shadowPayload();
        return void 0
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