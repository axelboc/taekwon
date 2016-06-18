import { fromJS } from 'immutable';
import { expect } from 'chai';
import presenter from '../../presenters/jp-presenter';

describe ('Presenter::JP', () => {
  
  it('presents whether the rings are open', () => {
    const state = fromJS({
      rings: [
        { jp: null },
        { jp: 'jp' }
      ]
    });
    
    expect(presenter.rings(state)).to.equal(fromJS([
      { isOpen: false },
      { isOpen: true }
    ]));
  });
  
});
