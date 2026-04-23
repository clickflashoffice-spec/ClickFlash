import { Album, Photo } from '../../types';

export interface AlbumWithPhotos extends Album {
    photos?: Photo[];
    coverPhotoUrl?: string;
    thumbnailUrl?: string;
    categories?: string[];
}
