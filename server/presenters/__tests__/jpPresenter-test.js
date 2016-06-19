import { fromJS } from 'immutable';
import { expect } from 'chai';
import { presenters } from '../jpPresenter';

describe ('Presenters::JP', () => {
  
  it('presents whether the rings are open', () => {
    const state = fromJS({
      rings: [
        { jp: null },
        { jp: 'jp' }
      ]
    });
    
    expect(presenters.rings(state)).to.equal(fromJS([
      { isOpen: false },
      { isOpen: true }
    ]));
  });
  
});
