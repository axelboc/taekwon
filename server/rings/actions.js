export const INIT = 'rings/INIT';
export const ADD = 'rings/ADD';
export const OPEN = 'rings/OPEN';
export const CLOSE = 'rings/CLOSE';

export const init = (count) => ({
  type: INIT,
  payload: { count }
});

export const add = () => ({
  type: ADD
});

export const open = (index, jpId) => ({
  type: OPEN,
  payload: { index, jpId }
});

export const close = (index) => ({
  type: CLOSE,
  payload: { index }
});
