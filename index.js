var VNodeStore = require('./lib/vnode-store.js');
//TODO (joseph@): Config.
var TOTAL_VNODES = 14;

/**
 * Constructor, takes all optional persistence function overrides but expects none.
 * @constructor
 * @param {function} loadVNKeysFromStorage A method that takes a vnode and
 *     the list of keys it owns, presumably recovered from a datastore.
 *  @param {function} persistKeyToVNode Given a key and a VNode, this function
 *      adds the relation to the datastore.
 *  @param {function} persistRemoveKeyFromVNode The inverse of
 *      persistKeyToVNode, removes a key relation to a VNode in the store.
 */
function Sevnup(loadVNKeysFromStorage, persistKeyToVNode, persistRemoveKeyFromVNode) {
    var allVNodes = [];
    for (var i=0; i<TOTAL_VNODES; i++) {
        allVNodes.append(i);
    }
    this.allVNodes = allVNodes;
    this.vnodeStore = new VNodeStore(loadVNKeysFromStorage, persistKeyToVNode, persistRemoveKeyFromVNode);
}

/**
 * Checks each VNode to see if the current node owns it, and if it does it
 * prompts recovery of each key.  For example, it finds that it owns VNode B,
 * recovers 14 keys that the old owner of VNode B was working on, and prompts
 * the client via callback to recover each of those keys, leaving that to the
 * individual client's business logic.
 */
Sevnup.prototype.loadAllKeys = function loadAllKeys() {
    var self = this;
    var vnodes = self.allVNodes;
    for (var i=0; i < vnodes.length; i++) {
        if (self.iOwnVNode(vnodes[i])) {
            self.vnodeStore.loadVNodeKeys(vnodes[i]);
        }
    }
};

/**
 * Takes a hashRing and subscribes to the correct events to maintain VNode
 * ownership.
 * @param {object} hashRing A ringPop implementation of a hashring.
 */
Sevnup.prototype.attachToRing = function attachToRing(hashRing) {
    this.hashRing = hashRing;
    hashRing.on('changed', this.loadAllKeys);
};

/**
 * Returns true if this node currently owns vnode.
 * @param {string} vnodeName The name of the vnode to check.
 */
Sevnup.prototype.iOwnVNode = function iOwnVNode(vnodeName) {
    var self = this;
    var node = self.ringpop.lookup(vnodeName);
    return self.ringpop.whoami() === node;
};

/**
 * Given a key, get the vnode it belongs to.  It can then be routed to the
 * correct node, via looking up by vnode name.
 * @param {string} key The key to match to a vnode.
 */
Sevnup.prototype.getVNodeForKey = function getVNodeForKey(key) {
    return this.hashCode(key) % TOTAL_VNODES;
};

/**
 * Given a string, turns it into a 32 bit integer.  To be moved to the utility
 * class.  TODO(joseph@).
 * @param {string} string the string to convert
 */
Sevnup.prototype.hashCode = function(string) {
    var hash = 0;
    var character;
    var length = string.length;
    if (length != 0) {
        for (var i = 0; i < length; i++) {
            character   = string.charCodeAt(i);
            hash  = ((hash << 5) - hash) + character;
            hash |= 0; 
        }
    }
    return hash;
};

module.exports = Sevnup;
