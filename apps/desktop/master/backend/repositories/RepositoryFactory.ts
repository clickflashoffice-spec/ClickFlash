import { DatabaseManager } from '../database/db';
import { AlbumRepo } from './AlbumRepo';
import { PhotoRepo } from './PhotoRepo';
import { OrderRepo } from './OrderRepo';
import { UserRepo } from './UserRepo';
import { SettingsRepo } from './SettingsRepo';
import { ProductRepo } from './ProductRepo';

export interface Repositories {
  albums: AlbumRepo;
  photos: PhotoRepo;
  orders: OrderRepo;
  users: UserRepo;
  settings: SettingsRepo;
  products: ProductRepo;
}

export function createRepositories(dbManager: DatabaseManager): Repositories {
  return {
    albums: new AlbumRepo(dbManager),
    photos: new PhotoRepo(dbManager),
    orders: new OrderRepo(dbManager),
    users: new UserRepo(dbManager),
    settings: new SettingsRepo(dbManager),
    products: new ProductRepo(dbManager),
  };
}
