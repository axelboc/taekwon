import { fromJS } from 'immutable';
import { expect } from 'chai';

import adminReducer from '../../../clients/admin/reducer';
import serverReducer from '../../../server/reducer';
import { admin as adminPresenter } from '../../../server/presenters';

describe('Admin', () => {
  
  it('can set foo', () => {
    const action = { type: 'SET_FOO' };
    
    const initialAdminState = fromJS({});
    const optimisticState = adminReducer(initialAdminState, action);
    
    const initialServerState = fromJS({});
    const nextServerState = serverReducer(initialServerState, action);
    const presentedServerState = adminPresenter(nextServerState.toJS());
    const nextState = adminReducer(optimisticState, { type: 'SET_STATE', state: presentedServerState });
    
    expect(optimisticState).to.equal(fromJS({ foo: 'bar' }));
    expect(nextState).to.equal(optimisticState);
  });
  
});
