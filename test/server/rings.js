import {Map, fromJS} from 'immutable';
import {expect} from 'chai';

import rings from '../../server/rings';

describe('Rings reducer', () => {

  it('has initial state', () => {
    const nextState = rings.reducer(undefined, { type: '' });
    expect(nextState).to.equal(fromJS([]));
  });
  
  it('handles INIT', () => {
    const initialState = Map();
    const action = { type: rings.actions.INIT, count: 1 };
    const nextState = rings.reducer(initialState, action);

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
