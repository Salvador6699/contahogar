import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFavorites, addFavorite, updateFavorite, deleteFavorite } from '@/api/local/favorites';
import { FavoriteExpense } from '@/types/finance';

export const useFavorites = () => {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const updateFavoriteMutation = useMutation({
    mutationFn: updateFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const deleteFavoriteMutation = useMutation({
    mutationFn: deleteFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return {
    favorites: favoritesQuery.data || [],
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    addFavorite: addFavoriteMutation.mutateAsync,
    updateFavorite: updateFavoriteMutation.mutateAsync,
    deleteFavorite: deleteFavoriteMutation.mutateAsync,
  };
};
