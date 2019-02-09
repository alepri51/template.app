const path = require('path');
const crypto = require('crypto2');

const { Classes } = require('template.api');
const { API, SecuredAPI } = Classes({ Models: require('../models') });

class Simple extends API {
    echo(...args) {
        return args;
    }
}

class Custom extends SecuredAPI {
    constructor(...args) {
        super(...args);
    }

    async $executeAction(method_name, target, reciever, ...args) {
        let response = await super.$executeAction(method_name, target, reciever, ...args);

        typeof(response) === 'object' && (response = { ...response, _sign_: `${this.payload.class} -> ${this.payload.name}`});
        return response;
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
    
    async simple() {
        //let shadow = await this.$shadowPayload();
        return '1000'
    }

    async set() {
        throw { w: 'hello' };
    }

    async err() {
        throw { w: 'hello' };
    }

    async signout() {
        await API.clearCache(this.payload);
        this.payload.class !== 'Shadow' && (this.payload = await Custom.shadow(this.payload));
    }

    async signup({ email, name, password }) {
        //await this.isNotShadow(this.payload.class);

        /* if(this.payload.class !== 'Shadow') 
            throw { code: 403, message: 'Cannot signup while singed in. Sign out and try again.'}; */

        let shadow = await Custom.Models.Shadow.findOne({
            _id: this.payload._id,
            email: true
        });

        !shadow && (this.payload = await Custom.shadow(this.payload));
        !shadow && await this.signup({});

        if(shadow) {
            let roles = await Custom.Models.Role.initialize({ service_name: process.env.SERVICE || 'DEFAULT' });
            let role = roles.filter(role => role.name === 'Users');
    
            const new_keys = await crypto.createKeyPair();
            let { privateKey, publicKey } = new_keys;

            let user = await Custom.Models.Shadow.transformTo(Custom.Models.User, {
                ...shadow,
                //hash:
                avatar: '',
                role,
                wallet: {
                    publicKey,
                    privateKey
                }
            })
    
            await API.clearCache(this.payload);
            this.payload = Custom.formatPayload(user);
        }
        //else throw { code: 403, message: 'Cannot signup while singed in. Sign out and try again.'};

        //return this.payload;
    }

    async signin({ email: address, password }) {
        //await this.isNotShadow(this.payload.class);

        /* if(this.payload.class !== 'Shadow') {
            throw { code: 403, message: 'Cannot signin again while singed in. Sign out and try again.'};
        } */

        address = address || 'user@example.com';
        password = password || '123';

        let email = await Custom.Models.Email.findOne({
            address,
            account: {
                role: {
                    service: true
                },
                email: true
            }
        });

        if(email && email.account) {
            await this.isShadow(email.account.class);

            let shadow_id = this.payload.class === 'Shadow' && this.payload._id;

            this.payload = Custom.formatPayload(email.account);
            shadow_id && (this.payload.shadow_id = shadow_id);
        }
        else throw { code: 401, message: 'User not found.'};
    }
}

module.exports = {
    Custom, Simple
}