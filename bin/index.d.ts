import { Store } from "ractor";
declare type Options = {
    [key: string]: any;
    actionCreators: Array<new (...args: any[]) => any> | {
        [key: string]: new (...args: any[]) => any;
    };
};
export declare function createRemoteDevStore(options: Options): new () => Store<any>;
export {};
