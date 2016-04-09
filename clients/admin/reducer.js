import reduceReducers from 'reduce-reducers';
import { setStateReducer } from '../shared/set-state';
import serverReducer from '../../server/reducer';

export default reduceReducers(
  setStateReducer,
  serverReducer
);
