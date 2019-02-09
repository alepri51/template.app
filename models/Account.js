const LRU = require('lru-cache');

let cache = new LRU({
    maxAge: +process.env.KEYS_CACHE_AGE || (1000 * 60),
    updateAgeOnGet: true,
    stale: false
});

const generate = require('nanoid/generate');

const { Node, Relation } = require('template.api').Models;

class Service extends Node {
    static get schema() {
        return {
            ...super.schema,
            $labels: ['Service'],
            name: {
                type: String,
                required: true
            },
            roles: [service2role]
        }
    }
}


class Role extends Node {
    static get schema() {
        return {
            ...super.schema,
            $labels: ['Security', 'Role'],
            name: {
                type: String,
                required: true
            },
            inherits: inheritance,
            service: {
                type: role2service,
                required: true
            }
        }
    }

    static async convert({ service_name }) {
        let roles = cache.get(`ROLES:CONVERTED:${service_name}`) || await this.initialize({ service_name });

        roles = roles.reduce((memo, role, inx, array) => {
   
            if(role.inherits) {
                let parent = array.find(record => role.inherits._id === record._id);

                if(parent) {
                    parent.children = parent.children || [];
                    parent.children.push(role);
                }
            }
            else {
                memo.push(role);
            }

            return memo;
        }, []);
        
        cache.set(`ROLES:CONVERTED:${service_name}`, roles);
        return roles;
    }

    static async initialize({ service_name }) {
        //debugger
        let roles = cache.get(`ROLES:${service_name}`);

        if(roles) 
            return roles;
        
        let service = await Service.findOne({
            name: service_name,
            roles: {
                service: true,
                inherits: true
            }
        });

        if(!service) {
            service = await Service.save({
                name: service_name
            });

            let roles = await Role.save({
                name: 'Anonymous',
                service,
                inherits: {
                    name: 'Everyone',
                    service
                }
            });
    
            roles = await Role.save({
                name: 'Administrators',
                service,
                inherits: {
                    name: 'Users',
                    service,
                    inherits: roles.inherits
                }
            });

            service = await Service.findOne({
                name: service_name,
                roles: {
                    service: true
                }
            });
        }

        cache.set(`ROLES:${service_name}`, service.roles);

        return service.roles;
    }
}

class inheritance extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $start: Role,
            $type: 'inherits',
            $end: Role
        }

        return schema;
    }
}

class role2service extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $start: Role,
            $type: 'used in',
            $end: Service
        }

        return schema;
    }
}

class service2role extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $direction: 'in',
            $start: Service,
            $type: 'used in',
            $end: Role
        }

        return schema;
    }
}

class Email extends Node {
    static get schema() {
        
        let schema = {
            ...super.schema,
            $labels: ['Email'],

            address: {
                type: String,
                required: true,
                modificators: ['trim', 'toUpperCase', 'toLowerCase']
            },
            verified: Boolean,
            pin: String,
            account: email2account
        }

        return schema
    }
}

class Account extends Node {
    static get schema() {
        return {
            ...super.schema,
            $labels: ['Account'],
            name: {
                type: String,
                required: true,
                default: (obj) => {
                    return generate('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ', 10)
                }
            },
            avatar: String,
            role: {
                type: account2role,
                required: true
                //TODO: make default cql to get node from db with given pattern i.e. match (n :RELATION {_id: $param}) RETURN n -> Model.find[One]({ _id: $param })
            },
            email: {
                type: account2email,
                required: false
            },
        }
    }

    static async keys(payload) {
        let key = `${payload.class}:${payload._id}`;
        const keys = cache.get(key);

        if(!keys) {
            let Class = module.exports[payload.class];
            
            let account = await Class.findOne({
                _id: payload._id,
                wallet: true
            });

            if(account) {
                if(account.wallet) {
                    let { privateKey: private_key, publicKey: public_key } = account.wallet;
    
                    key = account._id;
                    cache.set(key, { private_key, public_key });
                }
                else cache.set(key, {});
            }
            else throw { code: 404, message: 'User not found.' };

            return cache.get(key);
        }
        else return keys;
    }
}

class account2role extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $start: Account,
            $type: 'has',
            $end: Role
        }

        return schema;
    }
}

class email2account extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $direction: 'in',
            $start: Email,
            $type: 'has',
            $end: Account
        }

        return schema;
    }
}

class account2email extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $start: Account,
            $type: 'has',
            $end: Email
        }

        return schema;
    }
}

class Shadow extends Account {
    static get schema() {
        let schema = {
            ...super.schema,
            $labels: ['Account', 'Shadow'],
        }

        return schema;
    }

    static async findOrCreate({ _id, name, email, avatar, service_name }) {
        let shadow = _id && await Shadow.findOne({ 
            _id,
            role: {
                service: true
            },
            email: true
        });

        if(!shadow) {
            let roles = await Role.initialize({ service_name });
            let role = roles.find(role => role.name === 'Anonymous');

            shadow = await Shadow.save({
                name: name || 'mr. shadow user',
                avatar,
                role,
                email: {
                    address: email || 'shadow.user@example.com'
                }
            });
        }

        return shadow;
    }
}

class User extends Account {
    static get schema() {
        let schema = {
            ...super.schema,
            $labels: ['Account', 'User'],

            hash: String,
            
            reference: {
                type: String,
                required: true,
                default: (obj) => {
                    return generate('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)
                }
            },

            referer: {
                type: referer,
                required: false
            },
            email: {
                type: account2email,
                required: true
            },

            referals: [referal],

            wallet: {
                type: user2wallet,
                required: true
            }
        }

        return schema
    }

    static async keys() {
        return { public_key: '', private_key: '' }
    }
}

class user2user extends Relation {

    static get schema() {
        return {
            ...super.schema,
            $start: User,
            $end: User,
        }
    }
}

class referer extends user2user {
    static get schema() {
        let schema = {
            ...super.schema,
            $type: 'referer'
        }

        return schema;
    }
}

class referal extends user2user {
    static get schema() {
        let schema = {
            ...super.schema,
            $type: 'referal'
        }

        return schema;
    }
}

class Wallet extends Node {
    static get schema() {
        
        let schema = {
            ...super.schema,
            $labels: ['Wallet'],

            publicKey: {
                type: String,
                required: true
            },
            privateKey: {
                type: String,
                required: true
            },
            user: {
                type: wallet2user,
                required: false
            }
        }

        return schema
    }
}

class user2wallet extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $start: User,
            $type: 'has',
            $end: Wallet
        }

        return schema;
    }
}

class wallet2user extends Relation {

    static get schema() {
        let schema = {
            ...super.schema,
            $direction: 'in',
            $start: Wallet,
            $type: 'has',
            $end: User
        }

        return schema;
    }
}

module.exports = { Email, Role, Account, Shadow, User }
