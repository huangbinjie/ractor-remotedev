"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ractor_1 = require("ractor");
var remotedev_1 = require("remotedev");
function createRemoteDevStore(options) {
    return /** @class */ (function (_super) {
        __extends(RemoteDevStore, _super);
        function RemoteDevStore() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        RemoteDevStore.prototype.eventHandler = function (action) {
            this.remotedev.send(action.type ? action.type : "update", action.payload);
        };
        RemoteDevStore.prototype.genStateTree = function () {
            var e_1, _a;
            var stores = this.context.system.getRoot().getContext().children;
            var stateTree = {};
            try {
                for (var stores_1 = __values(stores), stores_1_1 = stores_1.next(); !stores_1_1.done; stores_1_1 = stores_1.next()) {
                    var store = stores_1_1.value;
                    var instance = store[1].getInstance();
                    stateTree[store[0]] = instance.state;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (stores_1_1 && !stores_1_1.done && (_a = stores_1.return)) _a.call(stores_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return stateTree;
        };
        RemoteDevStore.prototype.preStart = function () {
            var _this = this;
            if (!this.context.system.serialize) {
                console.warn("Not that if you dont set system option `serialize` to be true, you can not use custom action.");
            }
            this.remotedev = remotedev_1.connectViaExtension(options);
            this.context.system.eventStream.on("**", this.eventHandler.bind(this));
            this.connection = this.remotedev.subscribe(function (message) {
                // jump into
                if (message.type === "DISPATCH") {
                    var state_1 = remotedev_1.extractState(message);
                    if (state_1) {
                        Object.keys(state_1).forEach(function (storeName) {
                            var ref = _this.context.system.getRoot().getContext().child(storeName);
                            if (ref) {
                                var store = ref.getInstance();
                                store.replaceState(state_1[storeName]);
                            }
                        });
                    }
                }
                // devtools triggers action
                if (message.type === "ACTION") {
                    if (typeof message.payload === "string") {
                        if (_this.context.system.serialize) {
                            try {
                                var action = JSON.parse(message.payload);
                                _this.context.system.eventStream.emit("**", action);
                            }
                            catch (_a) {
                                throw TypeError("Action muse be plain object and should contain type and payload fields.");
                            }
                        }
                    }
                    else {
                        var actionCreators = options["actionCreators"];
                        var type = message.payload.name;
                        var payload = message.payload.args;
                        var selected = message.payload.selected;
                        if (_this.context.system.serialize) {
                            _this.context.system.eventStream.emit("**", { type: type, payload: payload });
                        }
                        else {
                            var selectedClass = Array.isArray(actionCreators) ? actionCreators[selected] : actionCreators[type];
                            var ractorAction = new (selectedClass.bind.apply(selectedClass, __spread([void 0], payload)))();
                            _this.context.system.dispatch(ractorAction);
                        }
                    }
                }
            });
            this.remotedev.init(this.genStateTree());
        };
        RemoteDevStore.prototype.postStop = function () {
            this.context.system.eventStream.off("**", this.eventHandler.bind(this));
            this.connection.unsubscribe();
        };
        RemoteDevStore.prototype.createReceive = function () {
            return this.receiveBuilder().build();
        };
        return RemoteDevStore;
    }(ractor_1.Store));
}
exports.createRemoteDevStore = createRemoteDevStore;
