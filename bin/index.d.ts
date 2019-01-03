import { Store } from "ractor";
export declare class RemoteDevStore extends Store<any> {
    remotedev: any;
    connection: any;
    eventHandler(action: any): void;
    preStart(): void;
    postStop(): void;
    createReceive(): import("js-actor/bin/interfaces/IActorReceive").IActorReceive<import("js-actor/bin/interfaces/Listener").Listener<object, "tell" | "ask">>;
}
