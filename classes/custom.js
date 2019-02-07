const path = require('path');
const crypto = require('crypto2');

const { Classes } = require('template.api');
const { API, SecuredAPI } = Classes();

class Simple extends API {
    echo(...args) {
        return args;
    }
}

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
        let shadow = await this.$getPayload();
        return { w: 'hello', ...shadow };
    }

    async hello(...args) {
        return { hello: 'world', ...args };
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

    async signout() {
        this.payload.class !== 'Shadow' && (this.payload = await Custom.shadow());
    }

    async signup({ email, name, password }) {
        let shadow = await Custom.Models.Shadow.findOne({
            _id: this.payload._id,
            email: true
        });

        if(shadow) {
            let roles = await Custom.Models.Role.initialize({ service_name: process.env.SERVICE || 'DEFAULT' });
            let role = roles.filter(role => role.name === 'Users');
    
            const new_keys = await crypto.createKeyPair();
            let { privateKey, publicKey } = new_keys;

            let user = await Custom.Models.Shadow.transformTo(Custom.Models.User, {
                ...shadow,
                //hash:
                role,
                wallet: {
                    publicKey,
                    privateKey
                }
            })
    
            this.payload = Custom.formatPayload(user);
        }
        else throw { code: 403, message: 'Cannot signup while singed in. Sign out and try again.'};

        //return this.payload;
    }

    async signin({ email: address, password }) {
        address = address || 'user@example.com';
        password = password || '123';

        let email = await Custom.Models.Email.findOne({
            address,
            account: {
                role: true,
                email: true
            }
        });

        if(email.account) {
            this.payload = Custom.formatPayload(email.account);
        }
        else throw { code: 401, message: 'User not found.'};
    }
}

module.exports = {
    Custom, Simple
}