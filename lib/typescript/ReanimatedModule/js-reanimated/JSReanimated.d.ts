import type { IReanimatedModule } from '../../commonTypes';
export declare function createJSReanimatedModule(): IReanimatedModule;
export declare enum Platform {
    WEB_IOS = "web iOS",
    WEB_ANDROID = "web Android",
    WEB = "web",
    UNKNOWN = "unknown"
}
declare global {
    interface Navigator {
        userAgent: string;
        vendor: string;
    }
}
//# sourceMappingURL=JSReanimated.d.ts.map