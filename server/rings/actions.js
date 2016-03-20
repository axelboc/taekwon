export const INIT = 'rings/INIT';
export const ADD = 'rings/ADD';
export const REMOVE = 'rings/REMOVE';
export const OPEN = 'rings/OPEN';
export const CLOSE = 'rings/CLOSE';
export const ADD_CJ = 'rings/ADD_CJ';
export const REMOVE_CJ = 'rings/REMOVE_CJ';

export const init = (count) => ({
  type: INIT,
  payload: { count }
});

export const add = () => ({
  type: ADD
});

export const remove = () => ({
  type: REMOVE
});

export const open = (index, jpId) => ({
  type: OPEN,
  payload: { index, jpId }
});

export const close = (index) => ({
  type: CLOSE,
  payload: { index }
});

export const addCJ = (index, cjId) => ({
  type: ADD_CJ,
  payload: { index, cjId }
});

export const removeCJ = (index, cjId) => ({
  type: REMOVE_CJ,
  payload: { index, cjId }
});
