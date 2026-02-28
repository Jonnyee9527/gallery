import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { MovieFilter } from '../../shared/types'
import {
  getMovies,
  getMovieDetail,
  updateMovieRating,
  toggleMovieFavorite,
  deleteMovie
} from '../database/dao/movieDao'

export function registerMovieHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MOVIE_LIST, (_event, filter: MovieFilter) => {
    return getMovies(filter)
  })

  ipcMain.handle(IPC_CHANNELS.MOVIE_DETAIL, (_event, id: number) => {
    return getMovieDetail(id)
  })

  ipcMain.handle(IPC_CHANNELS.MOVIE_UPDATE_RATING, (_event, movieId: number, rating: number) => {
    updateMovieRating(movieId, rating)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.MOVIE_TOGGLE_FAVORITE, (_event, movieId: number) => {
    return toggleMovieFavorite(movieId)
  })

  ipcMain.handle(IPC_CHANNELS.MOVIE_DELETE, (_event, movieId: number) => {
    deleteMovie(movieId)
    return true
  })
}
