const path = require('path');

const { Classes } = require('template.api');
const { API, SecuredAPI } = Classes();

class Custom extends SecuredAPI {
    constructor(...args) {
        super(...args);
    }

    async avatar() {
        //debugger
        let uploads = path.join(process.cwd(), 'uploads');
        
        let avatar = this.payload.avatar || 'default_user.png';

        if(this.payload.class === 'Shadow') {
            return {
                $redirect: true,
                url: avatar
            };
        }
        else {
            avatar = path.join(uploads, !avatar ? 'anonymous' : this.payload._id, avatar);

            return {
                $sendAsFile: true,
                file: avatar
            };
        }

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