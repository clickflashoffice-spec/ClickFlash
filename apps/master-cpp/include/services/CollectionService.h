#pragma once

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include "database/DatabaseManager.h"

namespace ClickFlash {

class CollectionService {
public:
    explicit CollectionService(DatabaseManager* db);
    ~CollectionService() = default;

    struct Album {
        int64_t id;
        std::string name;
        std::string description;
        int64_t photographerId;
        std::string eventDate;
        std::string status;
        std::string accessCode;
        int photoCount;
    };

    struct Photo {
        int64_t id;
        int64_t albumId;
        std::string filename;
        std::string originalPath;
        std::string thumbnailPath;
        std::string previewPath;
        std::string fullPath;
        int width;
        int height;
        int64_t fileSize;
        std::string rating;
        bool isFavorite;
        bool isRejected;
        std::string preset;
    };

    int64_t createAlbum(const std::string& name, const std::string& description,
                        int64_t photographerId, const std::string& eventDate);
    bool updateAlbum(int64_t albumId, const std::string& name, 
                     const std::string& description, const std::string& status);
    bool deleteAlbum(int64_t albumId);
    std::optional<Album> getAlbum(int64_t albumId);
    std::optional<Album> getAlbumByAccessCode(const std::string& accessCode);
    std::vector<Album> getAllAlbums();
    std::vector<Album> getAlbumsByPhotographer(int64_t photographerId);

    int64_t addPhoto(int64_t albumId, const std::string& filename,
                     const std::string& originalPath, int width, int height, int64_t fileSize);
    bool updatePhoto(int64_t photoId, const std::string& rating, bool isFavorite, bool isRejected);
    bool deletePhoto(int64_t photoId);
    std::optional<Photo> getPhoto(int64_t photoId);
    std::vector<Photo> getPhotosByAlbum(int64_t albumId);
    std::vector<Photo> getFavoritePhotos(int64_t albumId);
    std::vector<Photo> getRejectedPhotos(int64_t albumId);

    bool generateAccessCode(int64_t albumId);
    std::string generateRandomCode(int length);

private:
    DatabaseManager* db_;
};

}