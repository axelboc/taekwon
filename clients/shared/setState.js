import { Map } from 'immutable';

export const SET_STATE = 'SET_STATE';

export const setStateAction = (state) => ({
  type: SET_STATE,
  payload: state
});

export const setStateReducer = (state = Map(), { type, payload }) => {
  return type === SET_STATE ? state.merge(payload) : state;
};
