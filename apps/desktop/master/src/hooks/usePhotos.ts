import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { photoService } from "../services/api/photoService";
import { Photo } from "../types";

export const photoKeys = {
  all: ["photos", "v2"] as const,
  list: (albumId: string, context = "default") =>
    [...photoKeys.all, "list", context, albumId] as const,
};

export function useInfinitePhotos(albumId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: photoKeys.list(albumId, "infinite"),
    queryFn: ({ pageParam = 1 }) =>
      photoService.getPhotosPaginated(pageParam, 50, albumId),
    getNextPageParam: (lastPage) => {
      // 1-based pagination in PocketBase
      const currentPage = lastPage.page || 1;
      const totalPages = lastPage.totalPages || 1;
      if (currentPage < totalPages) {
        return currentPage + 1;
      }
      return undefined;
    },
    enabled: enabled && !!albumId,
    initialPageParam: 1,
  });
}

// Optional: Add mutations if needed later
export function useUpdatePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Photo> }) =>
      photoService.updatePhoto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}
