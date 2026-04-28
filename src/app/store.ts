import { configureStore } from "@reduxjs/toolkit"
import type { Action, ThunkAction } from "@reduxjs/toolkit"
import authReducer from "../features/auth/authSlice"
import moviesReducer from "../features/movies/moviesSlice"
import schedulesReducer from "../features/schedules/schedulesSlice"
import seatsReducer from "../features/seats/seatsSlice"
import ticketsReducer from "../features/tickets/ticketsSlice"
import adminReducer from "../features/admin/adminSlice"
import ratingsReducer from "../features/ratings/ratingsSlice"

const rootReducer = {
  auth: authReducer,
  movies: moviesReducer,
  schedules: schedulesReducer,
  seats: seatsReducer,
  tickets: ticketsReducer,
  admin: adminReducer,
  ratings: ratingsReducer,
}

export const store = configureStore({ reducer: rootReducer })

// Infer the type of `store`
export type AppStore = typeof store
export type RootState = ReturnType<typeof store.getState>
// Infer the `AppDispatch` type from the store itself
export type AppDispatch = typeof store.dispatch

export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>

// makeStore is needed for testing (allows preloaded state)
export function makeStore(preloadedState?: Partial<RootState>): AppStore {
  return configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reducer: rootReducer as any,
    preloadedState,
  }) as AppStore
}
