import { List, Map } from 'immutable';
import { createReducer } from 'redux-immutablejs';
import { INIT, ADD, REMOVE, OPEN, CLOSE, ADD_CJ, REMOVE_CJ } from './actions';

const initialState = new List();

function initRing() {
  return Map({
    jp: null,
    cjs: List(),
    slotCount: 4,
    matches: List()
  });
}

export const init = (state, { payload }) => {
  return List(Array.from({ length: payload.count }, () => initRing()));
};

export const add = state => {
  return state.push(initRing(state.size));
};

export const remove = state => {
  return state.pop();
};

export const open = (state, { payload }) => {
  return state.setIn([payload.index, 'jp'], payload.jpId);
};

export const close = (state, { payload }) => {
  return state.setIn([payload.index, 'jp'], null);
};

export const addCJ = (state, { payload }) => {
  return state.updateIn([payload.index, 'cjs'], cjs => cjs.push(payload.cjId));
};

export const removeCJ = (state, { payload }) => {
  return state.setIn(
    [payload.index, 'cjs'],
    state.getIn([payload.index, 'cjs']).filter(cjId => cjId !== payload.cjId)
  );
};

export default createReducer(initialState, {
  [INIT]: init,
  [ADD]: add,
  [REMOVE]: remove,
  [OPEN]: open,
  [CLOSE]: close,
  [ADD_CJ]: addCJ,
  [REMOVE_CJ]: removeCJ
});
