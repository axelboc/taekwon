import { fromJS } from 'immutable';
import { expect } from 'chai';

import { setStateAction } from '../shared/set-state';
import { addRing } from '../admin/actions';
import reducer from '../admin/reducer';
import serverReducer from '../../server/reducer';
import { admin as serverPresenter } from '../../server/presenters';

describe('Admin', () => {
  
  it('can add ring', () => {
    const action = addRing();
    
    const initialState = fromJS({});
    const optimisticState = reducer(initialState, action);
    
    const initialServerState = fromJS({});
    const nextServerState = serverReducer(initialServerState, action);
    const presentedServerState = serverPresenter(nextServerState.toJS());
    
    const nextState = reducer(optimisticState, setStateAction(presentedServerState));
    
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
