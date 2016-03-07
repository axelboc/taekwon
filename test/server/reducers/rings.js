import {Map, fromJS} from 'immutable';
import {expect} from 'chai';

import { INIT_RINGS } from '../../../server/actions/rings';
import ringsReducer from '../../../server/reducers/rings';

describe('Rings reducer', () => {

  it('has initial state', () => {
    const nextState = ringsReducer(undefined, { type: '' });
    expect(nextState).to.equal(fromJS([]));
  });
  
  it('handles INIT_RINGS', () => {
    const initialState = Map();
    const action = { type: 'INIT_RINGS', count: 1 };
    const nextState = ringsReducer(initialState, action);

    expect(nextState).to.equal(fromJS([
      {
        index: 0,
        jp: null,
        cjs: [],
        slotCount: 4,
        mathes: []
      }
    ]));
    
  });

});
