import { fromJS } from 'immutable';
import { expect } from 'chai';
import createPresenter from '../../presenters';

describe ('Presenter::CJ', () => {

  const presenter = createPresenter('cj', 'id');
  
  it('presents whether the rings are open and full', () => {
    const state = fromJS({
      rings: [
        { jp: null, cjs: [], slotCount: 1 },
        { jp: 'jp', cjs: [], slotCount: 1 },
        { jp: 'jp', cjs: ['cj'], slotCount: 1 }
      ]
    });
    
    expect(presenter(state)).to.equal(fromJS({
      rings: [
        { isOpen: false, isFull: false },
        { isOpen: true, isFull: false },
        { isOpen: true, isFull: true }
      ]
    }));
  });
  
});
