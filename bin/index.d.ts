import { Store } from "ractor";
export declare function createRemoteDevStore(options: {
    [key: string]: any;
}): new () => Store<any>;
