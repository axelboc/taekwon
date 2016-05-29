import { fromJS } from 'immutable';
import { expect } from 'chai';

import cjPresenter from '../../presenters/cj-presenter';

describe ('Presenter::CJ', () => {
  
  it('presents whether the rings are open and full', () => {
    const state = fromJS({
      rings: [
        { jp: null, cjs: [], slotCount: 1 },
        { jp: 'jp', cjs: [], slotCount: 1 },
        { jp: 'jp', cjs: ['cj'], slotCount: 1 }
      ]
  });
    
    const presentedState = cjPresenter(state);
    
    expect(presentedState).to.equal(fromJS({
      rings: [
        { isOpen: false, isFull: false },
        { isOpen: true, isFull: false },
        { isOpen: true, isFull: true }
      ]
    }));
  });
  
});
