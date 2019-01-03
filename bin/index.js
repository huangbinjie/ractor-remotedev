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
Object.defineProperty(exports, "__esModule", { value: true });
var ractor_1 = require("ractor");
var remotedev_1 = require("remotedev");
var RemoteDevStore = /** @class */ (function (_super) {
    __extends(RemoteDevStore, _super);
    function RemoteDevStore() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RemoteDevStore.prototype.eventHandler = function (action) {
        if (isPlainObject(action)) {
            this.remotedev.send(action.type ? action.type : "update", action.payload);
        }
        if (isClassAction(action)) {
            this.remotedev.send(Object.getPrototypeOf(action).constructor.name, genStateTree(this.context.system));
        }
    };
    RemoteDevStore.prototype.preStart = function () {
        var _this = this;
        this.remotedev = remotedev_1.connectViaExtension();
        this.context.system.eventStream.on("**", this.eventHandler.bind(this));
        this.connection = this.remotedev.subscribe(function (message) {
            var state = remotedev_1.extractState(message);
            if (state) {
                Object.keys(state).forEach(function (storeName) {
                    var ref = _this.context.system.getRoot().getContext().child(storeName);
                    if (ref) {
                        var store = ref.getInstance();
                        store.replaceState(state[storeName]);
                    }
                });
            }
        });
        this.remotedev.send("init");
        this.remotedev.send("ready", genStateTree(this.context.system));
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
exports.RemoteDevStore = RemoteDevStore;
function genStateTree(system) {
    var e_1, _a;
    var stores = system.getRoot().getContext().children;
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
}
function isPlainObject(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    var proto = obj;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(obj) === proto;
}
function isClassAction(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    return Object.getPrototypeOf(obj) !== Object.prototype;
}
