import { fromJS } from 'immutable';
import { expect } from 'chai';

import { setStateAction } from '../shared/set-state';
import { addRing } from '../admin/actions';
import reducer from '../admin/reducer';
import serverReducer from '../../server/reducer';
import serverPresenter from '../../server/presenters/admin-presenter';

describe('Admin', () => {
  
  it('can add ring', () => {
    const action = addRing();
    
    const initialState = fromJS({});
    const optimisticState = reducer(initialState, action);
    
    const initialServerState = fromJS({});
    const nextServerState = serverReducer(initialServerState, action);
    const presentedServerState = serverPresenter(nextServerState.toJS());
    
    const nextState = reducer(optimisticState, setStateAction(presentedServerState));
    
    expect(action.meta.isRemote).to.be.true;
    expect(nextState).to.equal(optimisticState);
    expect(nextState.get('rings')).to.equal(fromJS([
      {
        jp: null,
        cjs: [],
        slotCount: 4,
        matches: []
      }
    ]));
  });
  
});
