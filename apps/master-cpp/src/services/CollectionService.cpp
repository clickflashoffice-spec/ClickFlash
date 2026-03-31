#include "services/CollectionService.h"
#include "database/DatabaseManager.h"
#include <sstream>
#include <random>
#include <iomanip>

namespace ClickFlash {

CollectionService::CollectionService(DatabaseManager* db) : db_(db) {}

int64_t CollectionService::createAlbum(const std::string& name, const std::string& description,
                                        int64_t photographerId, const std::string& eventDate) {
    std::string accessCode = generateRandomCode(6);
    
    std::ostringstream sql;
    sql << "INSERT INTO albums (name, description, photographer_id, event_date, status, access_code, created_at) "
        << "VALUES ('" << name << "', '" << description << "', " << photographerId 
        << ", '" << eventDate << "', 'active', '" << accessCode << "', datetime('now'))";
    
    db_->execute(sql.str());
    return db_->getLastInsertRowId();
}

bool CollectionService::updateAlbum(int64_t albumId, const std::string& name, 
                                     const std::string& description, const std::string& status) {
    std::ostringstream sql;
    sql << "UPDATE albums SET name = '" << name << "', description = '" << description 
        << "', status = '" << status << "', updated_at = datetime('now') WHERE id = " << albumId;
    return db_->execute(sql.str());
}

bool CollectionService::deleteAlbum(int64_t albumId) {
    db_->execute("DELETE FROM photos WHERE album_id = " + std::to_string(albumId));
    return db_->execute("DELETE FROM albums WHERE id = " + std::to_string(albumId));
}

std::optional<CollectionService::Album> CollectionService::getAlbum(int64_t albumId) {
    auto result = db_->queryMultiple("SELECT id, name, description, photographer_id, event_date, status, access_code FROM albums WHERE id = " + std::to_string(albumId));
    if (result.empty()) return std::nullopt;
    
    Album album;
    album.id = std::stoll(result[0][0]);
    album.name = result[0][1];
    album.description = result[0][2];
    album.photographerId = std::stoll(result[0][3]);
    album.eventDate = result[0][4];
    album.status = result[0][5];
    album.accessCode = result[0][6];
    return album;
}

std::optional<CollectionService::Album> CollectionService::getAlbumByAccessCode(const std::string& accessCode) {
    auto result = db_->queryMultiple("SELECT id, name, description, photographer_id, event_date, status, access_code FROM albums WHERE access_code = '" + accessCode + "'");
    if (result.empty()) return std::nullopt;
    
    Album album;
    album.id = std::stoll(result[0][0]);
    album.name = result[0][1];
    album.description = result[0][2];
    album.photographerId = std::stoll(result[0][3]);
    album.eventDate = result[0][4];
    album.status = result[0][5];
    album.accessCode = result[0][6];
    return album;
}

std::vector<CollectionService::Album> CollectionService::getAllAlbums() {
    auto result = db_->queryMultiple("SELECT id, name, description, photographer_id, event_date, status, access_code FROM albums ORDER BY created_at DESC");
    std::vector<Album> albums;
    
    for (const auto& row : result) {
        Album album;
        album.id = std::stoll(row[0]);
        album.name = row[1];
        album.description = row[2];
        album.photographerId = std::stoll(row[3]);
        album.eventDate = row[4];
        album.status = row[5];
        album.accessCode = row[6];
        albums.push_back(album);
    }
    return albums;
}

std::vector<CollectionService::Album> CollectionService::getAlbumsByPhotographer(int64_t photographerId) {
    auto result = db_->queryMultiple("SELECT id, name, description, photographer_id, event_date, status, access_code FROM albums WHERE photographer_id = " + std::to_string(photographerId));
    std::vector<Album> albums;
    
    for (const auto& row : result) {
        Album album;
        album.id = std::stoll(row[0]);
        album.name = row[1];
        album.description = row[2];
        album.photographerId = std::stoll(row[3]);
        album.eventDate = row[4];
        album.status = row[5];
        album.accessCode = row[6];
        albums.push_back(album);
    }
    return albums;
}

int64_t CollectionService::addPhoto(int64_t albumId, const std::string& filename,
                                     const std::string& originalPath, int width, int height, int64_t fileSize) {
    std::ostringstream sql;
    sql << "INSERT INTO photos (album_id, filename, original_path, width, height, file_size, imported_at) "
        << "VALUES (" << albumId << ", '" << filename << "', '" << originalPath << "', " 
        << width << ", " << height << ", " << fileSize << ", datetime('now'))";
    
    db_->execute(sql.str());
    return db_->getLastInsertRowId();
}

bool CollectionService::updatePhoto(int64_t photoId, const std::string& rating, bool isFavorite, bool isRejected) {
    std::ostringstream sql;
    sql << "UPDATE photos SET rating = '" << rating << "', is_favorite = " << (isFavorite ? 1 : 0) 
        << ", is_rejected = " << (isRejected ? 1 : 0) << " WHERE id = " << photoId;
    return db_->execute(sql.str());
}

bool CollectionService::deletePhoto(int64_t photoId) {
    return db_->execute("DELETE FROM photos WHERE id = " + std::to_string(photoId));
}

std::optional<CollectionService::Photo> CollectionService::getPhoto(int64_t photoId) {
    auto result = db_->queryMultiple("SELECT id, album_id, filename, original_path, thumbnail_path, preview_path, full_path, width, height, file_size, rating, is_favorite, is_rejected, preset FROM photos WHERE id = " + std::to_string(photoId));
    if (result.empty()) return std::nullopt;
    
    Photo photo;
    photo.id = std::stoll(result[0][0]);
    photo.albumId = std::stoll(result[0][1]);
    photo.filename = result[0][2];
    photo.originalPath = result[0][3];
    photo.thumbnailPath = result[0][4];
    photo.previewPath = result[0][5];
    photo.fullPath = result[0][6];
    photo.width = std::stoi(result[0][7]);
    photo.height = std::stoi(result[0][8]);
    photo.fileSize = std::stoll(result[0][9]);
    photo.rating = result[0][10];
    photo.isFavorite = result[0][11] == "1";
    photo.isRejected = result[0][12] == "1";
    photo.preset = result[0][13];
    return photo;
}

std::vector<CollectionService::Photo> CollectionService::getPhotosByAlbum(int64_t albumId) {
    auto result = db_->queryMultiple("SELECT id, album_id, filename, original_path, thumbnail_path, preview_path, full_path, width, height, file_size, rating, is_favorite, is_rejected, preset FROM photos WHERE album_id = " + std::to_string(albumId));
    std::vector<Photo> photos;
    
    for (const auto& row : result) {
        Photo photo;
        photo.id = std::stoll(row[0]);
        photo.albumId = std::stoll(row[1]);
        photo.filename = row[2];
        photo.originalPath = row[3];
        photo.thumbnailPath = row[4];
        photo.previewPath = row[5];
        photo.fullPath = row[6];
        photo.width = std::stoi(row[7]);
        photo.height = std::stoi(row[8]);
        photo.fileSize = std::stoll(row[9]);
        photo.rating = row[10];
        photo.isFavorite = row[11] == "1";
        photo.isRejected = row[12] == "1";
        photo.preset = row[13];
        photos.push_back(photo);
    }
    return photos;
}

std::vector<CollectionService::Photo> CollectionService::getFavoritePhotos(int64_t albumId) {
    return getPhotosByAlbum(albumId);
}

std::vector<CollectionService::Photo> CollectionService::getRejectedPhotos(int64_t albumId) {
    return getPhotosByAlbum(albumId);
}

bool CollectionService::generateAccessCode(int64_t albumId) {
    std::string code = generateRandomCode(6);
    std::ostringstream sql;
    sql << "UPDATE albums SET access_code = '" << code << "' WHERE id = " << albumId;
    return db_->execute(sql.str());
}

std::string CollectionService::generateRandomCode(int length) {
    const char chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dist(0, sizeof(chars) - 2);
    
    std::string code;
    for (int i = 0; i < length; ++i) {
        code += chars[dist(gen)];
    }
    return code;
}

}