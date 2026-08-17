import { z } from 'zod';
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const SortSchema: z.ZodObject<{
    sortBy: z.ZodDefault<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortBy: string;
    sortOrder: "asc" | "desc";
}, {
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const DateRangeSchema: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const UserRoleSchema: z.ZodEnum<["CEO", "Manager", "Team Leader", "Admin", "Photographer"]>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["CEO", "Manager", "Team Leader", "Admin", "Photographer"]>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    specialty: z.ZodOptional<z.ZodString>;
    destinationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email: string;
    role: "CEO" | "Manager" | "Team Leader" | "Admin" | "Photographer";
    avatarUrl?: string | undefined;
    specialty?: string | undefined;
    destinationId?: string | undefined;
}, {
    id: string;
    name: string;
    email: string;
    role: "CEO" | "Manager" | "Team Leader" | "Admin" | "Photographer";
    avatarUrl?: string | undefined;
    specialty?: string | undefined;
    destinationId?: string | undefined;
}>;
export declare const UserCreateSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["CEO", "Manager", "Team Leader", "Admin", "Photographer"]>;
    password: z.ZodString;
    destinationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    role: "CEO" | "Manager" | "Team Leader" | "Admin" | "Photographer";
    password: string;
    destinationId?: string | undefined;
}, {
    name: string;
    email: string;
    role: "CEO" | "Manager" | "Team Leader" | "Admin" | "Photographer";
    password: string;
    destinationId?: string | undefined;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const MagicLinkSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const PinLoginSchema: z.ZodObject<{
    email: z.ZodString;
    pin: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    pin: string;
}, {
    email: string;
    pin: string;
}>;
export declare const CullingStatusSchema: z.ZodEnum<["Selected", "Rejected", "Pending"]>;
export declare const ProofingStatusSchema: z.ZodEnum<["pending", "approved", "rejected"]>;
export declare const ManualEditsSchema: z.ZodObject<{
    _v: z.ZodOptional<z.ZodNumber>;
    exposure: z.ZodDefault<z.ZodNumber>;
    contrast: z.ZodDefault<z.ZodNumber>;
    highlights: z.ZodDefault<z.ZodNumber>;
    shadows: z.ZodDefault<z.ZodNumber>;
    saturate: z.ZodDefault<z.ZodNumber>;
    vibrance: z.ZodDefault<z.ZodNumber>;
    grayscale: z.ZodDefault<z.ZodNumber>;
    sepia: z.ZodDefault<z.ZodNumber>;
    invert: z.ZodDefault<z.ZodNumber>;
    hueRotate: z.ZodDefault<z.ZodNumber>;
    temperature: z.ZodDefault<z.ZodNumber>;
    tint: z.ZodDefault<z.ZodNumber>;
    whites: z.ZodDefault<z.ZodNumber>;
    blacks: z.ZodDefault<z.ZodNumber>;
    soften: z.ZodDefault<z.ZodNumber>;
    rotate: z.ZodDefault<z.ZodNumber>;
    straighten: z.ZodDefault<z.ZodNumber>;
    perspectiveX: z.ZodDefault<z.ZodNumber>;
    perspectiveY: z.ZodDefault<z.ZodNumber>;
    clarity: z.ZodDefault<z.ZodNumber>;
    dropShadow: z.ZodDefault<z.ZodNumber>;
    sharpen: z.ZodOptional<z.ZodNumber>;
    vignette: z.ZodOptional<z.ZodNumber>;
    brightness: z.ZodOptional<z.ZodNumber>;
    crop: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        width: number;
        height: number;
    }, {
        x: number;
        y: number;
        width: number;
        height: number;
    }>>;
    zoomLevel: z.ZodOptional<z.ZodNumber>;
    centerX: z.ZodOptional<z.ZodNumber>;
    centerY: z.ZodOptional<z.ZodNumber>;
    retouchActions: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    annotations: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    exposure: number;
    contrast: number;
    highlights: number;
    shadows: number;
    saturate: number;
    vibrance: number;
    grayscale: number;
    sepia: number;
    invert: number;
    hueRotate: number;
    temperature: number;
    tint: number;
    whites: number;
    blacks: number;
    soften: number;
    rotate: number;
    straighten: number;
    perspectiveX: number;
    perspectiveY: number;
    clarity: number;
    dropShadow: number;
    _v?: number | undefined;
    sharpen?: number | undefined;
    vignette?: number | undefined;
    brightness?: number | undefined;
    crop?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | undefined;
    zoomLevel?: number | undefined;
    centerX?: number | undefined;
    centerY?: number | undefined;
    retouchActions?: any[] | undefined;
    annotations?: any[] | undefined;
}, {
    _v?: number | undefined;
    exposure?: number | undefined;
    contrast?: number | undefined;
    highlights?: number | undefined;
    shadows?: number | undefined;
    saturate?: number | undefined;
    vibrance?: number | undefined;
    grayscale?: number | undefined;
    sepia?: number | undefined;
    invert?: number | undefined;
    hueRotate?: number | undefined;
    temperature?: number | undefined;
    tint?: number | undefined;
    whites?: number | undefined;
    blacks?: number | undefined;
    soften?: number | undefined;
    rotate?: number | undefined;
    straighten?: number | undefined;
    perspectiveX?: number | undefined;
    perspectiveY?: number | undefined;
    clarity?: number | undefined;
    dropShadow?: number | undefined;
    sharpen?: number | undefined;
    vignette?: number | undefined;
    brightness?: number | undefined;
    crop?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | undefined;
    zoomLevel?: number | undefined;
    centerX?: number | undefined;
    centerY?: number | undefined;
    retouchActions?: any[] | undefined;
    annotations?: any[] | undefined;
}>;
export declare const PhotoSchema: z.ZodObject<{
    id: z.ZodString;
    albumId: z.ZodString;
    url: z.ZodString;
    watermarkUrl: z.ZodOptional<z.ZodString>;
    originalUrl: z.ZodOptional<z.ZodString>;
    previewUrl: z.ZodOptional<z.ZodString>;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    photographerId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    category: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    resolution: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodNumber>;
    capturedAt: z.ZodOptional<z.ZodString>;
    hotelId: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    cullingStatus: z.ZodOptional<z.ZodEnum<["Selected", "Rejected", "Pending"]>>;
    proofingStatus: z.ZodOptional<z.ZodEnum<["pending", "approved", "rejected"]>>;
    manualEdits: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        _v: z.ZodOptional<z.ZodNumber>;
        exposure: z.ZodDefault<z.ZodNumber>;
        contrast: z.ZodDefault<z.ZodNumber>;
        highlights: z.ZodDefault<z.ZodNumber>;
        shadows: z.ZodDefault<z.ZodNumber>;
        saturate: z.ZodDefault<z.ZodNumber>;
        vibrance: z.ZodDefault<z.ZodNumber>;
        grayscale: z.ZodDefault<z.ZodNumber>;
        sepia: z.ZodDefault<z.ZodNumber>;
        invert: z.ZodDefault<z.ZodNumber>;
        hueRotate: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        tint: z.ZodDefault<z.ZodNumber>;
        whites: z.ZodDefault<z.ZodNumber>;
        blacks: z.ZodDefault<z.ZodNumber>;
        soften: z.ZodDefault<z.ZodNumber>;
        rotate: z.ZodDefault<z.ZodNumber>;
        straighten: z.ZodDefault<z.ZodNumber>;
        perspectiveX: z.ZodDefault<z.ZodNumber>;
        perspectiveY: z.ZodDefault<z.ZodNumber>;
        clarity: z.ZodDefault<z.ZodNumber>;
        dropShadow: z.ZodDefault<z.ZodNumber>;
        sharpen: z.ZodOptional<z.ZodNumber>;
        vignette: z.ZodOptional<z.ZodNumber>;
        brightness: z.ZodOptional<z.ZodNumber>;
        crop: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            width: number;
            height: number;
        }, {
            x: number;
            y: number;
            width: number;
            height: number;
        }>>;
        zoomLevel: z.ZodOptional<z.ZodNumber>;
        centerX: z.ZodOptional<z.ZodNumber>;
        centerY: z.ZodOptional<z.ZodNumber>;
        retouchActions: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        annotations: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        exposure: number;
        contrast: number;
        highlights: number;
        shadows: number;
        saturate: number;
        vibrance: number;
        grayscale: number;
        sepia: number;
        invert: number;
        hueRotate: number;
        temperature: number;
        tint: number;
        whites: number;
        blacks: number;
        soften: number;
        rotate: number;
        straighten: number;
        perspectiveX: number;
        perspectiveY: number;
        clarity: number;
        dropShadow: number;
        _v?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    }, {
        _v?: number | undefined;
        exposure?: number | undefined;
        contrast?: number | undefined;
        highlights?: number | undefined;
        shadows?: number | undefined;
        saturate?: number | undefined;
        vibrance?: number | undefined;
        grayscale?: number | undefined;
        sepia?: number | undefined;
        invert?: number | undefined;
        hueRotate?: number | undefined;
        temperature?: number | undefined;
        tint?: number | undefined;
        whites?: number | undefined;
        blacks?: number | undefined;
        soften?: number | undefined;
        rotate?: number | undefined;
        straighten?: number | undefined;
        perspectiveX?: number | undefined;
        perspectiveY?: number | undefined;
        clarity?: number | undefined;
        dropShadow?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    }>>>;
    autoEdits: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        _v: z.ZodOptional<z.ZodNumber>;
        exposure: z.ZodDefault<z.ZodNumber>;
        contrast: z.ZodDefault<z.ZodNumber>;
        highlights: z.ZodDefault<z.ZodNumber>;
        shadows: z.ZodDefault<z.ZodNumber>;
        saturate: z.ZodDefault<z.ZodNumber>;
        vibrance: z.ZodDefault<z.ZodNumber>;
        grayscale: z.ZodDefault<z.ZodNumber>;
        sepia: z.ZodDefault<z.ZodNumber>;
        invert: z.ZodDefault<z.ZodNumber>;
        hueRotate: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        tint: z.ZodDefault<z.ZodNumber>;
        whites: z.ZodDefault<z.ZodNumber>;
        blacks: z.ZodDefault<z.ZodNumber>;
        soften: z.ZodDefault<z.ZodNumber>;
        rotate: z.ZodDefault<z.ZodNumber>;
        straighten: z.ZodDefault<z.ZodNumber>;
        perspectiveX: z.ZodDefault<z.ZodNumber>;
        perspectiveY: z.ZodDefault<z.ZodNumber>;
        clarity: z.ZodDefault<z.ZodNumber>;
        dropShadow: z.ZodDefault<z.ZodNumber>;
        sharpen: z.ZodOptional<z.ZodNumber>;
        vignette: z.ZodOptional<z.ZodNumber>;
        brightness: z.ZodOptional<z.ZodNumber>;
        crop: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            width: number;
            height: number;
        }, {
            x: number;
            y: number;
            width: number;
            height: number;
        }>>;
        zoomLevel: z.ZodOptional<z.ZodNumber>;
        centerX: z.ZodOptional<z.ZodNumber>;
        centerY: z.ZodOptional<z.ZodNumber>;
        retouchActions: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        annotations: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        exposure: number;
        contrast: number;
        highlights: number;
        shadows: number;
        saturate: number;
        vibrance: number;
        grayscale: number;
        sepia: number;
        invert: number;
        hueRotate: number;
        temperature: number;
        tint: number;
        whites: number;
        blacks: number;
        soften: number;
        rotate: number;
        straighten: number;
        perspectiveX: number;
        perspectiveY: number;
        clarity: number;
        dropShadow: number;
        _v?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    }, {
        _v?: number | undefined;
        exposure?: number | undefined;
        contrast?: number | undefined;
        highlights?: number | undefined;
        shadows?: number | undefined;
        saturate?: number | undefined;
        vibrance?: number | undefined;
        grayscale?: number | undefined;
        sepia?: number | undefined;
        invert?: number | undefined;
        hueRotate?: number | undefined;
        temperature?: number | undefined;
        tint?: number | undefined;
        whites?: number | undefined;
        blacks?: number | undefined;
        soften?: number | undefined;
        rotate?: number | undefined;
        straighten?: number | undefined;
        perspectiveX?: number | undefined;
        perspectiveY?: number | undefined;
        clarity?: number | undefined;
        dropShadow?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    }>>>;
    autoEnhanced: z.ZodOptional<z.ZodBoolean>;
    originalFilename: z.ZodOptional<z.ZodString>;
    fileHash: z.ZodOptional<z.ZodString>;
    storagePath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    albumId: string;
    url: string;
    photographerId: string | number;
    width?: number | undefined;
    height?: number | undefined;
    watermarkUrl?: string | undefined;
    originalUrl?: string | undefined;
    previewUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    title?: string | undefined;
    category?: string | undefined;
    resolution?: number | undefined;
    size?: number | undefined;
    capturedAt?: string | undefined;
    hotelId?: string | undefined;
    mimeType?: string | undefined;
    cullingStatus?: "Selected" | "Rejected" | "Pending" | undefined;
    proofingStatus?: "pending" | "approved" | "rejected" | undefined;
    manualEdits?: {
        exposure: number;
        contrast: number;
        highlights: number;
        shadows: number;
        saturate: number;
        vibrance: number;
        grayscale: number;
        sepia: number;
        invert: number;
        hueRotate: number;
        temperature: number;
        tint: number;
        whites: number;
        blacks: number;
        soften: number;
        rotate: number;
        straighten: number;
        perspectiveX: number;
        perspectiveY: number;
        clarity: number;
        dropShadow: number;
        _v?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    } | null | undefined;
    autoEdits?: {
        exposure: number;
        contrast: number;
        highlights: number;
        shadows: number;
        saturate: number;
        vibrance: number;
        grayscale: number;
        sepia: number;
        invert: number;
        hueRotate: number;
        temperature: number;
        tint: number;
        whites: number;
        blacks: number;
        soften: number;
        rotate: number;
        straighten: number;
        perspectiveX: number;
        perspectiveY: number;
        clarity: number;
        dropShadow: number;
        _v?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    } | null | undefined;
    autoEnhanced?: boolean | undefined;
    originalFilename?: string | undefined;
    fileHash?: string | undefined;
    storagePath?: string | undefined;
}, {
    id: string;
    albumId: string;
    url: string;
    photographerId: string | number;
    width?: number | undefined;
    height?: number | undefined;
    watermarkUrl?: string | undefined;
    originalUrl?: string | undefined;
    previewUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    title?: string | undefined;
    category?: string | undefined;
    resolution?: number | undefined;
    size?: number | undefined;
    capturedAt?: string | undefined;
    hotelId?: string | undefined;
    mimeType?: string | undefined;
    cullingStatus?: "Selected" | "Rejected" | "Pending" | undefined;
    proofingStatus?: "pending" | "approved" | "rejected" | undefined;
    manualEdits?: {
        _v?: number | undefined;
        exposure?: number | undefined;
        contrast?: number | undefined;
        highlights?: number | undefined;
        shadows?: number | undefined;
        saturate?: number | undefined;
        vibrance?: number | undefined;
        grayscale?: number | undefined;
        sepia?: number | undefined;
        invert?: number | undefined;
        hueRotate?: number | undefined;
        temperature?: number | undefined;
        tint?: number | undefined;
        whites?: number | undefined;
        blacks?: number | undefined;
        soften?: number | undefined;
        rotate?: number | undefined;
        straighten?: number | undefined;
        perspectiveX?: number | undefined;
        perspectiveY?: number | undefined;
        clarity?: number | undefined;
        dropShadow?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    } | null | undefined;
    autoEdits?: {
        _v?: number | undefined;
        exposure?: number | undefined;
        contrast?: number | undefined;
        highlights?: number | undefined;
        shadows?: number | undefined;
        saturate?: number | undefined;
        vibrance?: number | undefined;
        grayscale?: number | undefined;
        sepia?: number | undefined;
        invert?: number | undefined;
        hueRotate?: number | undefined;
        temperature?: number | undefined;
        tint?: number | undefined;
        whites?: number | undefined;
        blacks?: number | undefined;
        soften?: number | undefined;
        rotate?: number | undefined;
        straighten?: number | undefined;
        perspectiveX?: number | undefined;
        perspectiveY?: number | undefined;
        clarity?: number | undefined;
        dropShadow?: number | undefined;
        sharpen?: number | undefined;
        vignette?: number | undefined;
        brightness?: number | undefined;
        crop?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        zoomLevel?: number | undefined;
        centerX?: number | undefined;
        centerY?: number | undefined;
        retouchActions?: any[] | undefined;
        annotations?: any[] | undefined;
    } | null | undefined;
    autoEnhanced?: boolean | undefined;
    originalFilename?: string | undefined;
    fileHash?: string | undefined;
    storagePath?: string | undefined;
}>;
export declare const PhotoCreateSchema: z.ZodObject<{
    albumId: z.ZodString;
    url: z.ZodString;
    photographerId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    title: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    originalFilename: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    capturedAt: z.ZodOptional<z.ZodString>;
    hotelId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    albumId: string;
    url: string;
    photographerId: string | number;
    width?: number | undefined;
    height?: number | undefined;
    title?: string | undefined;
    category?: string | undefined;
    capturedAt?: string | undefined;
    hotelId?: string | undefined;
    mimeType?: string | undefined;
    originalFilename?: string | undefined;
}, {
    albumId: string;
    url: string;
    photographerId: string | number;
    width?: number | undefined;
    height?: number | undefined;
    title?: string | undefined;
    category?: string | undefined;
    capturedAt?: string | undefined;
    hotelId?: string | undefined;
    mimeType?: string | undefined;
    originalFilename?: string | undefined;
}>;
export declare const PhotoUpdateSchema: z.ZodObject<{
    albumId: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    photographerId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    title: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    category: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    originalFilename: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    mimeType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    width: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    height: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    capturedAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    hotelId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    width?: number | undefined;
    height?: number | undefined;
    albumId?: string | undefined;
    url?: string | undefined;
    title?: string | undefined;
    photographerId?: string | number | undefined;
    category?: string | undefined;
    capturedAt?: string | undefined;
    hotelId?: string | undefined;
    mimeType?: string | undefined;
    originalFilename?: string | undefined;
}, {
    width?: number | undefined;
    height?: number | undefined;
    albumId?: string | undefined;
    url?: string | undefined;
    title?: string | undefined;
    photographerId?: string | number | undefined;
    category?: string | undefined;
    capturedAt?: string | undefined;
    hotelId?: string | undefined;
    mimeType?: string | undefined;
    originalFilename?: string | undefined;
}>;
export declare const PhotoBatchUpdateSchema: z.ZodObject<{
    photoIds: z.ZodArray<z.ZodString, "many">;
    updates: z.ZodObject<{
        albumId: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        photographerId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        title: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        category: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        originalFilename: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        mimeType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        width: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        height: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        capturedAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        hotelId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        width?: number | undefined;
        height?: number | undefined;
        albumId?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        photographerId?: string | number | undefined;
        category?: string | undefined;
        capturedAt?: string | undefined;
        hotelId?: string | undefined;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
        albumId?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        photographerId?: string | number | undefined;
        category?: string | undefined;
        capturedAt?: string | undefined;
        hotelId?: string | undefined;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    photoIds: string[];
    updates: {
        width?: number | undefined;
        height?: number | undefined;
        albumId?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        photographerId?: string | number | undefined;
        category?: string | undefined;
        capturedAt?: string | undefined;
        hotelId?: string | undefined;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    };
}, {
    photoIds: string[];
    updates: {
        width?: number | undefined;
        height?: number | undefined;
        albumId?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        photographerId?: string | number | undefined;
        category?: string | undefined;
        capturedAt?: string | undefined;
        hotelId?: string | undefined;
        mimeType?: string | undefined;
        originalFilename?: string | undefined;
    };
}>;
export declare const AlbumStatusSchema: z.ZodEnum<["Draft", "Finalized", "Archived"]>;
export declare const AlbumSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    date: z.ZodString;
    photographerId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    roomNumber: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    eventType: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["Draft", "Finalized", "Archived"]>>;
    customerEmail: z.ZodOptional<z.ZodString>;
    coverPhotoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    photographerId: string | number;
    date: string;
    status?: "Draft" | "Finalized" | "Archived" | undefined;
    roomNumber?: string | undefined;
    source?: string | undefined;
    eventType?: string | undefined;
    customerEmail?: string | undefined;
    coverPhotoUrl?: string | undefined;
}, {
    id: string;
    title: string;
    photographerId: string | number;
    date: string;
    status?: "Draft" | "Finalized" | "Archived" | undefined;
    roomNumber?: string | undefined;
    source?: string | undefined;
    eventType?: string | undefined;
    customerEmail?: string | undefined;
    coverPhotoUrl?: string | undefined;
}>;
export declare const AlbumCreateSchema: z.ZodObject<{
    title: z.ZodString;
    date: z.ZodString;
    photographerId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    roomNumber: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    eventType: z.ZodOptional<z.ZodString>;
    customerEmail: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    photographerId: string | number;
    date: string;
    roomNumber?: string | undefined;
    source?: string | undefined;
    eventType?: string | undefined;
    customerEmail?: string | undefined;
}, {
    title: string;
    photographerId: string | number;
    date: string;
    roomNumber?: string | undefined;
    source?: string | undefined;
    eventType?: string | undefined;
    customerEmail?: string | undefined;
}>;
export declare const AlbumUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    photographerId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    roomNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    source: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    eventType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    customerEmail: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    photographerId?: string | number | undefined;
    date?: string | undefined;
    roomNumber?: string | undefined;
    source?: string | undefined;
    eventType?: string | undefined;
    customerEmail?: string | undefined;
}, {
    title?: string | undefined;
    photographerId?: string | number | undefined;
    date?: string | undefined;
    roomNumber?: string | undefined;
    source?: string | undefined;
    eventType?: string | undefined;
    customerEmail?: string | undefined;
}>;
export declare const DeliveryTypeSchema: z.ZodEnum<["digital", "print", "both"]>;
export declare const OrderStatusSchema: z.ZodEnum<["Completed", "Pending", "Processing", "Cancelled", "Delivered"]>;
export declare const PaymentMethodSchema: z.ZodEnum<["Cash", "Card"]>;
export declare const OrderSourceSchema: z.ZodEnum<["kiosk", "manual"]>;
export declare const CartItemSchema: z.ZodObject<{
    id: z.ZodString;
    photoId: z.ZodString;
    name: z.ZodString;
    format: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
    deliveryType: z.ZodOptional<z.ZodEnum<["digital", "print", "both"]>>;
    productId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    photoId: string;
    quantity: number;
    price: number;
    format?: string | undefined;
    deliveryType?: "digital" | "print" | "both" | undefined;
    productId?: string | undefined;
}, {
    id: string;
    name: string;
    photoId: string;
    quantity: number;
    price: number;
    format?: string | undefined;
    deliveryType?: "digital" | "print" | "both" | undefined;
    productId?: string | undefined;
}>;
export declare const CartItemCreateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    photoId: z.ZodString;
    name: z.ZodString;
    format: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
    deliveryType: z.ZodOptional<z.ZodEnum<["digital", "print", "both"]>>;
    productId: z.ZodOptional<z.ZodString>;
}, "id">, "strip", z.ZodTypeAny, {
    name: string;
    photoId: string;
    quantity: number;
    price: number;
    format?: string | undefined;
    deliveryType?: "digital" | "print" | "both" | undefined;
    productId?: string | undefined;
}, {
    name: string;
    photoId: string;
    quantity: number;
    price: number;
    format?: string | undefined;
    deliveryType?: "digital" | "print" | "both" | undefined;
    productId?: string | undefined;
}>;
export declare const OrderItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    format: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
    deliveryType: z.ZodOptional<z.ZodEnum<["digital", "print", "both"]>>;
    productId: z.ZodOptional<z.ZodString>;
    checksum: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    quantity: number;
    price: number;
    format?: string | undefined;
    deliveryType?: "digital" | "print" | "both" | undefined;
    productId?: string | undefined;
    checksum?: string | undefined;
}, {
    id: string;
    name: string;
    quantity: number;
    price: number;
    format?: string | undefined;
    deliveryType?: "digital" | "print" | "both" | undefined;
    productId?: string | undefined;
    checksum?: string | undefined;
}>;
export declare const OrderSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodString;
    clientName: z.ZodString;
    email: z.ZodString;
    status: z.ZodEnum<["Completed", "Pending", "Processing", "Cancelled", "Delivered"]>;
    total: z.ZodNumber;
    photographerId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        format: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        price: z.ZodNumber;
        deliveryType: z.ZodOptional<z.ZodEnum<["digital", "print", "both"]>>;
        productId: z.ZodOptional<z.ZodString>;
        checksum: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
        checksum?: string | undefined;
    }, {
        id: string;
        name: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
        checksum?: string | undefined;
    }>, "many">;
    appliedDiscount: z.ZodOptional<z.ZodNumber>;
    destinationId: z.ZodOptional<z.ZodString>;
    paymentMethod: z.ZodOptional<z.ZodEnum<["Cash", "Card"]>>;
    albumId: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodEnum<["kiosk", "manual"]>>;
    roomNumber: z.ZodOptional<z.ZodString>;
    rfidTag: z.ZodOptional<z.ZodString>;
    orderNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered";
    id: string;
    email: string;
    photographerId: string | number;
    date: string;
    clientName: string;
    total: number;
    items: {
        id: string;
        name: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
        checksum?: string | undefined;
    }[];
    destinationId?: string | undefined;
    albumId?: string | undefined;
    roomNumber?: string | undefined;
    source?: "kiosk" | "manual" | undefined;
    appliedDiscount?: number | undefined;
    paymentMethod?: "Cash" | "Card" | undefined;
    rfidTag?: string | undefined;
    orderNumber?: string | undefined;
}, {
    status: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered";
    id: string;
    email: string;
    photographerId: string | number;
    date: string;
    clientName: string;
    total: number;
    items: {
        id: string;
        name: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
        checksum?: string | undefined;
    }[];
    destinationId?: string | undefined;
    albumId?: string | undefined;
    roomNumber?: string | undefined;
    source?: "kiosk" | "manual" | undefined;
    appliedDiscount?: number | undefined;
    paymentMethod?: "Cash" | "Card" | undefined;
    rfidTag?: string | undefined;
    orderNumber?: string | undefined;
}>;
export declare const OrderCreateSchema: z.ZodObject<{
    date: z.ZodString;
    clientName: z.ZodString;
    email: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["Completed", "Pending", "Processing", "Cancelled", "Delivered"]>>;
    total: z.ZodNumber;
    photographerId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    items: z.ZodArray<z.ZodObject<Omit<{
        id: z.ZodString;
        photoId: z.ZodString;
        name: z.ZodString;
        format: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        price: z.ZodNumber;
        deliveryType: z.ZodOptional<z.ZodEnum<["digital", "print", "both"]>>;
        productId: z.ZodOptional<z.ZodString>;
    }, "id">, "strip", z.ZodTypeAny, {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }, {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }>, "many">;
    appliedDiscount: z.ZodOptional<z.ZodNumber>;
    destinationId: z.ZodOptional<z.ZodString>;
    paymentMethod: z.ZodOptional<z.ZodEnum<["Cash", "Card"]>>;
    albumId: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodEnum<["kiosk", "manual"]>>;
    roomNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered";
    email: string;
    photographerId: string | number;
    date: string;
    clientName: string;
    total: number;
    items: {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }[];
    destinationId?: string | undefined;
    albumId?: string | undefined;
    roomNumber?: string | undefined;
    source?: "kiosk" | "manual" | undefined;
    appliedDiscount?: number | undefined;
    paymentMethod?: "Cash" | "Card" | undefined;
}, {
    email: string;
    photographerId: string | number;
    date: string;
    clientName: string;
    total: number;
    items: {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }[];
    status?: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered" | undefined;
    destinationId?: string | undefined;
    albumId?: string | undefined;
    roomNumber?: string | undefined;
    source?: "kiosk" | "manual" | undefined;
    appliedDiscount?: number | undefined;
    paymentMethod?: "Cash" | "Card" | undefined;
}>;
export declare const OrderUpdateSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    clientName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["Completed", "Pending", "Processing", "Cancelled", "Delivered"]>>>;
    total: z.ZodOptional<z.ZodNumber>;
    photographerId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<Omit<{
        id: z.ZodString;
        photoId: z.ZodString;
        name: z.ZodString;
        format: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        price: z.ZodNumber;
        deliveryType: z.ZodOptional<z.ZodEnum<["digital", "print", "both"]>>;
        productId: z.ZodOptional<z.ZodString>;
    }, "id">, "strip", z.ZodTypeAny, {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }, {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }>, "many">>;
    appliedDiscount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    destinationId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    paymentMethod: z.ZodOptional<z.ZodOptional<z.ZodEnum<["Cash", "Card"]>>>;
    albumId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    source: z.ZodOptional<z.ZodOptional<z.ZodEnum<["kiosk", "manual"]>>>;
    roomNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered" | undefined;
    email?: string | undefined;
    destinationId?: string | undefined;
    albumId?: string | undefined;
    photographerId?: string | number | undefined;
    date?: string | undefined;
    roomNumber?: string | undefined;
    source?: "kiosk" | "manual" | undefined;
    clientName?: string | undefined;
    total?: number | undefined;
    items?: {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }[] | undefined;
    appliedDiscount?: number | undefined;
    paymentMethod?: "Cash" | "Card" | undefined;
}, {
    status?: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered" | undefined;
    email?: string | undefined;
    destinationId?: string | undefined;
    albumId?: string | undefined;
    photographerId?: string | number | undefined;
    date?: string | undefined;
    roomNumber?: string | undefined;
    source?: "kiosk" | "manual" | undefined;
    clientName?: string | undefined;
    total?: number | undefined;
    items?: {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }[] | undefined;
    appliedDiscount?: number | undefined;
    paymentMethod?: "Cash" | "Card" | undefined;
}>;
export declare const ProductSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    stock: z.ZodOptional<z.ZodNumber>;
    isFeatured: z.ZodOptional<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    price: number;
    category?: string | undefined;
    stock?: number | undefined;
    isFeatured?: boolean | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
}, {
    id: string;
    name: string;
    price: number;
    category?: string | undefined;
    stock?: number | undefined;
    isFeatured?: boolean | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
}>;
export declare const ProductCreateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    name: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    stock: z.ZodOptional<z.ZodNumber>;
    isFeatured: z.ZodOptional<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "id">, "strip", z.ZodTypeAny, {
    name: string;
    price: number;
    category?: string | undefined;
    stock?: number | undefined;
    isFeatured?: boolean | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
}, {
    name: string;
    price: number;
    category?: string | undefined;
    stock?: number | undefined;
    isFeatured?: boolean | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
}>;
export declare const ProductUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    price: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    isFeatured: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    category?: string | undefined;
    price?: number | undefined;
    stock?: number | undefined;
    isFeatured?: boolean | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
}, {
    name?: string | undefined;
    category?: string | undefined;
    price?: number | undefined;
    stock?: number | undefined;
    isFeatured?: boolean | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
}>;
export declare const SessionTypeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    numberOfPhotos: z.ZodNumber;
    price: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    price: number;
    numberOfPhotos: number;
}, {
    id: string;
    name: string;
    price: number;
    numberOfPhotos: number;
}>;
export declare const CurrencySchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    symbol: z.ZodString;
    rate: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    code: string;
    name: string;
    rate: number;
}, {
    symbol: string;
    code: string;
    name: string;
    rate: number;
}>;
export declare const BookingStatusSchema: z.ZodEnum<["confirmed", "pending", "cancelled", "completed", "no-show", "Confirmed", "Pending", "Cancelled", "Completed", "No-show"]>;
export declare const BookingSchema: z.ZodObject<{
    id: z.ZodString;
    clientName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    time: z.ZodString;
    sessionTypeId: z.ZodOptional<z.ZodString>;
    photographerId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    status: z.ZodDefault<z.ZodEnum<["confirmed", "pending", "cancelled", "completed", "no-show", "Confirmed", "Pending", "Cancelled", "Completed", "No-show"]>>;
    notes: z.ZodOptional<z.ZodString>;
    roomNumber: z.ZodOptional<z.ZodString>;
    destinationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "Pending" | "pending" | "Completed" | "Cancelled" | "confirmed" | "cancelled" | "completed" | "no-show" | "Confirmed" | "No-show";
    id: string;
    email: string;
    date: string;
    clientName: string;
    time: string;
    destinationId?: string | undefined;
    photographerId?: string | number | undefined;
    roomNumber?: string | undefined;
    phone?: string | undefined;
    sessionTypeId?: string | undefined;
    notes?: string | undefined;
}, {
    id: string;
    email: string;
    date: string;
    clientName: string;
    time: string;
    status?: "Pending" | "pending" | "Completed" | "Cancelled" | "confirmed" | "cancelled" | "completed" | "no-show" | "Confirmed" | "No-show" | undefined;
    destinationId?: string | undefined;
    photographerId?: string | number | undefined;
    roomNumber?: string | undefined;
    phone?: string | undefined;
    sessionTypeId?: string | undefined;
    notes?: string | undefined;
}>;
export declare const BookingCreateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    clientName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    time: z.ZodString;
    sessionTypeId: z.ZodOptional<z.ZodString>;
    photographerId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    status: z.ZodDefault<z.ZodEnum<["confirmed", "pending", "cancelled", "completed", "no-show", "Confirmed", "Pending", "Cancelled", "Completed", "No-show"]>>;
    notes: z.ZodOptional<z.ZodString>;
    roomNumber: z.ZodOptional<z.ZodString>;
    destinationId: z.ZodOptional<z.ZodString>;
}, "id">, "strip", z.ZodTypeAny, {
    status: "Pending" | "pending" | "Completed" | "Cancelled" | "confirmed" | "cancelled" | "completed" | "no-show" | "Confirmed" | "No-show";
    email: string;
    date: string;
    clientName: string;
    time: string;
    destinationId?: string | undefined;
    photographerId?: string | number | undefined;
    roomNumber?: string | undefined;
    phone?: string | undefined;
    sessionTypeId?: string | undefined;
    notes?: string | undefined;
}, {
    email: string;
    date: string;
    clientName: string;
    time: string;
    status?: "Pending" | "pending" | "Completed" | "Cancelled" | "confirmed" | "cancelled" | "completed" | "no-show" | "Confirmed" | "No-show" | undefined;
    destinationId?: string | undefined;
    photographerId?: string | number | undefined;
    roomNumber?: string | undefined;
    phone?: string | undefined;
    sessionTypeId?: string | undefined;
    notes?: string | undefined;
}>;
export declare const BookingUpdateSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["confirmed", "pending", "cancelled", "completed", "no-show", "Confirmed", "Pending", "Cancelled", "Completed", "No-show"]>>>;
    email: z.ZodOptional<z.ZodString>;
    destinationId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    photographerId: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    date: z.ZodOptional<z.ZodString>;
    roomNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    clientName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    time: z.ZodOptional<z.ZodString>;
    sessionTypeId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "Pending" | "pending" | "Completed" | "Cancelled" | "confirmed" | "cancelled" | "completed" | "no-show" | "Confirmed" | "No-show" | undefined;
    email?: string | undefined;
    destinationId?: string | undefined;
    photographerId?: string | number | undefined;
    date?: string | undefined;
    roomNumber?: string | undefined;
    clientName?: string | undefined;
    phone?: string | undefined;
    time?: string | undefined;
    sessionTypeId?: string | undefined;
    notes?: string | undefined;
}, {
    status?: "Pending" | "pending" | "Completed" | "Cancelled" | "confirmed" | "cancelled" | "completed" | "no-show" | "Confirmed" | "No-show" | undefined;
    email?: string | undefined;
    destinationId?: string | undefined;
    photographerId?: string | number | undefined;
    date?: string | undefined;
    roomNumber?: string | undefined;
    clientName?: string | undefined;
    phone?: string | undefined;
    time?: string | undefined;
    sessionTypeId?: string | undefined;
    notes?: string | undefined;
}>;
export declare const ClientSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    roomNumber: z.ZodOptional<z.ZodString>;
    rfidTag: z.ZodOptional<z.ZodString>;
    totalOrders: z.ZodOptional<z.ZodNumber>;
    totalSpent: z.ZodOptional<z.ZodNumber>;
    lastVisit: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email: string;
    roomNumber?: string | undefined;
    rfidTag?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    totalOrders?: number | undefined;
    totalSpent?: number | undefined;
    lastVisit?: string | undefined;
}, {
    id: string;
    name: string;
    email: string;
    roomNumber?: string | undefined;
    rfidTag?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    totalOrders?: number | undefined;
    totalSpent?: number | undefined;
    lastVisit?: string | undefined;
}>;
export declare const ClientCreateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    roomNumber: z.ZodOptional<z.ZodString>;
    rfidTag: z.ZodOptional<z.ZodString>;
    totalOrders: z.ZodOptional<z.ZodNumber>;
    totalSpent: z.ZodOptional<z.ZodNumber>;
    lastVisit: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "id" | "totalOrders" | "totalSpent" | "lastVisit">, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    roomNumber?: string | undefined;
    rfidTag?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
}, {
    name: string;
    email: string;
    roomNumber?: string | undefined;
    rfidTag?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
}>;
export declare const DestinationTypeSchema: z.ZodEnum<["Resort", "City"]>;
export declare const DestinationStatusSchema: z.ZodEnum<["Online", "Offline", "Connected", "Disconnected", "Degraded"]>;
export declare const DestinationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    country: z.ZodString;
    type: z.ZodEnum<["Resort", "City"]>;
    siteCode: z.ZodOptional<z.ZodString>;
    licenseKey: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["Online", "Offline", "Connected", "Disconnected", "Degraded"]>>;
    lastSeen: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "Resort" | "City";
    id: string;
    name: string;
    country: string;
    status?: "Online" | "Offline" | "Connected" | "Disconnected" | "Degraded" | undefined;
    siteCode?: string | undefined;
    licenseKey?: string | undefined;
    lastSeen?: string | undefined;
    version?: string | undefined;
    ipAddress?: string | undefined;
}, {
    type: "Resort" | "City";
    id: string;
    name: string;
    country: string;
    status?: "Online" | "Offline" | "Connected" | "Disconnected" | "Degraded" | undefined;
    siteCode?: string | undefined;
    licenseKey?: string | undefined;
    lastSeen?: string | undefined;
    version?: string | undefined;
    ipAddress?: string | undefined;
}>;
export declare const KioskStatusSchema: z.ZodEnum<["Active", "Inactive", "Maintenance", "Connected", "Disconnected"]>;
export declare const TouchKioskSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<["Active", "Inactive", "Maintenance", "Connected", "Disconnected"]>;
    lastHeartbeat: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "Connected" | "Disconnected" | "Active" | "Inactive" | "Maintenance";
    id: string;
    name: string;
    version?: string | undefined;
    ipAddress?: string | undefined;
    lastHeartbeat?: string | undefined;
}, {
    status: "Connected" | "Disconnected" | "Active" | "Inactive" | "Maintenance";
    id: string;
    name: string;
    version?: string | undefined;
    ipAddress?: string | undefined;
    lastHeartbeat?: string | undefined;
}>;
export declare const SyncLogLevelSchema: z.ZodEnum<["info", "warn", "error"]>;
export declare const SyncLogSchema: z.ZodObject<{
    id: z.ZodString;
    masterId: z.ZodString;
    destinationId: z.ZodOptional<z.ZodString>;
    level: z.ZodEnum<["info", "warn", "error"]>;
    event: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: string;
    masterId: string;
    level: "info" | "warn" | "error";
    event: string;
    timestamp: string;
    destinationId?: string | undefined;
    details?: Record<string, unknown> | undefined;
}, {
    message: string;
    id: string;
    masterId: string;
    level: "info" | "warn" | "error";
    event: string;
    timestamp: string;
    destinationId?: string | undefined;
    details?: Record<string, unknown> | undefined;
}>;
export declare const ApiResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const ApiErrorSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    path: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    error: string;
    success: false;
    code?: string | undefined;
    path?: string | undefined;
    details?: Record<string, unknown> | undefined;
}, {
    error: string;
    success: false;
    code?: string | undefined;
    path?: string | undefined;
    details?: Record<string, unknown> | undefined;
}>;
export declare const LicenseKeySchema: z.ZodObject<{
    key: z.ZodString;
    studioName: z.ZodString;
    hardwareId: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
    features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tier: z.ZodDefault<z.ZodEnum<["starter", "professional", "enterprise"]>>;
}, "strip", z.ZodTypeAny, {
    key: string;
    studioName: string;
    tier: "starter" | "professional" | "enterprise";
    hardwareId?: string | undefined;
    expiresAt?: string | undefined;
    features?: string[] | undefined;
}, {
    key: string;
    studioName: string;
    hardwareId?: string | undefined;
    expiresAt?: string | undefined;
    features?: string[] | undefined;
    tier?: "starter" | "professional" | "enterprise" | undefined;
}>;
export declare const PermissionStringSchema: z.ZodString;
export declare const RolePermissionsSchema: z.ZodObject<{
    role: z.ZodEnum<["CEO", "Manager", "Team Leader", "Admin", "Photographer"]>;
    permissions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    role: "CEO" | "Manager" | "Team Leader" | "Admin" | "Photographer";
    permissions: string[];
}, {
    role: "CEO" | "Manager" | "Team Leader" | "Admin" | "Photographer";
    permissions: string[];
}>;
export declare const RfidAuthSchema: z.ZodObject<{
    rfidTag: z.ZodString;
    stationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rfidTag: string;
    stationId?: string | undefined;
}, {
    rfidTag: string;
    stationId?: string | undefined;
}>;
export declare const PosOrderCreateSchema: z.ZodObject<{
    date: z.ZodString;
    clientName: z.ZodString;
    email: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["Completed", "Pending", "Processing", "Cancelled", "Delivered"]>>;
    total: z.ZodNumber;
    photographerId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    items: z.ZodArray<z.ZodObject<Omit<{
        id: z.ZodString;
        photoId: z.ZodString;
        name: z.ZodString;
        format: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        price: z.ZodNumber;
        deliveryType: z.ZodOptional<z.ZodEnum<["digital", "print", "both"]>>;
        productId: z.ZodOptional<z.ZodString>;
    }, "id">, "strip", z.ZodTypeAny, {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }, {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }>, "many">;
    appliedDiscount: z.ZodOptional<z.ZodNumber>;
    destinationId: z.ZodOptional<z.ZodString>;
    albumId: z.ZodOptional<z.ZodString>;
    roomNumber: z.ZodOptional<z.ZodString>;
} & {
    source: z.ZodDefault<z.ZodLiteral<"kiosk">>;
    paymentMethod: z.ZodEnum<["Cash", "Card"]>;
    amountPaid: z.ZodNumber;
    changeDue: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered";
    email: string;
    photographerId: string | number;
    date: string;
    source: "kiosk";
    clientName: string;
    total: number;
    items: {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }[];
    paymentMethod: "Cash" | "Card";
    amountPaid: number;
    destinationId?: string | undefined;
    albumId?: string | undefined;
    roomNumber?: string | undefined;
    appliedDiscount?: number | undefined;
    changeDue?: number | undefined;
}, {
    email: string;
    photographerId: string | number;
    date: string;
    clientName: string;
    total: number;
    items: {
        name: string;
        photoId: string;
        quantity: number;
        price: number;
        format?: string | undefined;
        deliveryType?: "digital" | "print" | "both" | undefined;
        productId?: string | undefined;
    }[];
    paymentMethod: "Cash" | "Card";
    amountPaid: number;
    status?: "Pending" | "Completed" | "Processing" | "Cancelled" | "Delivered" | undefined;
    destinationId?: string | undefined;
    albumId?: string | undefined;
    roomNumber?: string | undefined;
    source?: "kiosk" | undefined;
    appliedDiscount?: number | undefined;
    changeDue?: number | undefined;
}>;
export declare const MobileLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    deviceId: z.ZodString;
    deviceModel: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    deviceId: string;
    deviceModel?: string | undefined;
}, {
    email: string;
    password: string;
    deviceId: string;
    deviceModel?: string | undefined;
}>;
export declare const MobileUploadSchema: z.ZodObject<{
    albumId: z.ZodString;
    photoCount: z.ZodNumber;
    totalSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    albumId: string;
    photoCount: number;
    totalSize: number;
}, {
    albumId: string;
    photoCount: number;
    totalSize: number;
}>;
export declare const MobileSyncSchema: z.ZodObject<{
    lastSyncToken: z.ZodOptional<z.ZodString>;
    deviceId: z.ZodString;
    batteryLevel: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
    lastSyncToken?: string | undefined;
    batteryLevel?: number | undefined;
}, {
    deviceId: string;
    lastSyncToken?: string | undefined;
    batteryLevel?: number | undefined;
}>;
export declare const FleetHeartbeatSchema: z.ZodObject<{
    kioskId: z.ZodString;
    status: z.ZodEnum<["Active", "Inactive", "Maintenance", "Connected", "Disconnected"]>;
    uptime: z.ZodNumber;
    freeDiskSpace: z.ZodOptional<z.ZodNumber>;
    printerStatus: z.ZodOptional<z.ZodEnum<["Ready", "PaperLow", "InkLow", "Error", "Offline"]>>;
    cameraStatus: z.ZodOptional<z.ZodEnum<["Connected", "Disconnected", "Error"]>>;
    networkLatency: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "Connected" | "Disconnected" | "Active" | "Inactive" | "Maintenance";
    kioskId: string;
    uptime: number;
    freeDiskSpace?: number | undefined;
    printerStatus?: "Offline" | "Ready" | "PaperLow" | "InkLow" | "Error" | undefined;
    cameraStatus?: "Connected" | "Disconnected" | "Error" | undefined;
    networkLatency?: number | undefined;
}, {
    status: "Connected" | "Disconnected" | "Active" | "Inactive" | "Maintenance";
    kioskId: string;
    uptime: number;
    freeDiskSpace?: number | undefined;
    printerStatus?: "Offline" | "Ready" | "PaperLow" | "InkLow" | "Error" | undefined;
    cameraStatus?: "Connected" | "Disconnected" | "Error" | undefined;
    networkLatency?: number | undefined;
}>;
export declare const FleetCommandSchema: z.ZodObject<{
    kioskId: z.ZodString;
    command: z.ZodEnum<["Restart", "UpdateSoftware", "LockScreen", "ClearCache", "SyncNow"]>;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    scheduledFor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kioskId: string;
    command: "Restart" | "UpdateSoftware" | "LockScreen" | "ClearCache" | "SyncNow";
    payload?: Record<string, unknown> | undefined;
    scheduledFor?: string | undefined;
}, {
    kioskId: string;
    command: "Restart" | "UpdateSoftware" | "LockScreen" | "ClearCache" | "SyncNow";
    payload?: Record<string, unknown> | undefined;
    scheduledFor?: string | undefined;
}>;
export declare const LicenseValidationSchema: z.ZodObject<{
    licenseKey: z.ZodString;
    hardwareId: z.ZodString;
    version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    licenseKey: string;
    version: string;
    hardwareId: string;
}, {
    licenseKey: string;
    version: string;
    hardwareId: string;
}>;
export declare const LicenseRevokeSchema: z.ZodObject<{
    licenseKey: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    licenseKey: string;
    reason?: string | undefined;
}, {
    licenseKey: string;
    reason?: string | undefined;
}>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Photo = z.infer<typeof PhotoSchema>;
export type PhotoCreate = z.infer<typeof PhotoCreateSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type AlbumCreate = z.infer<typeof AlbumCreateSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderCreate = z.infer<typeof OrderCreateSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type BookingCreate = z.infer<typeof BookingCreateSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type TouchKiosk = z.infer<typeof TouchKioskSchema>;
export type SyncLog = z.infer<typeof SyncLogSchema>;
export type SessionType = z.infer<typeof SessionTypeSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type LicenseKey = z.infer<typeof LicenseKeySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type ManualEdits = z.infer<typeof ManualEditsSchema>;
export type PermissionString = z.infer<typeof PermissionStringSchema>;
export type RolePermissions = z.infer<typeof RolePermissionsSchema>;
export type RfidAuth = z.infer<typeof RfidAuthSchema>;
export type PosOrderCreate = z.infer<typeof PosOrderCreateSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type MobileLogin = z.infer<typeof MobileLoginSchema>;
export type MobileUpload = z.infer<typeof MobileUploadSchema>;
export type MobileSync = z.infer<typeof MobileSyncSchema>;
export type FleetHeartbeat = z.infer<typeof FleetHeartbeatSchema>;
export type FleetCommand = z.infer<typeof FleetCommandSchema>;
export type LicenseValidation = z.infer<typeof LicenseValidationSchema>;
export type LicenseRevoke = z.infer<typeof LicenseRevokeSchema>;
//# sourceMappingURL=schemas.d.ts.map