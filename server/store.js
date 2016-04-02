import { createStore } from 'redux';
import reducer from './reducer';

export default function () {
  return createStore(reducer);
}
