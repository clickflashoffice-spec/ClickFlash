declare module 'qrcode';
declare module 'react-window';

interface NetworkInformation extends EventTarget {
    readonly type: ConnectionType;
    readonly effectiveType: string;
    readonly downlinkMax: number;
    readonly downlink: number;
    readonly rtt: number;
    readonly saveData: boolean;
    onchange: EventListener;
}

interface Navigator {
    readonly connection?: NetworkInformation;
    readonly mozConnection?: NetworkInformation;
    readonly webkitConnection?: NetworkInformation;
}
