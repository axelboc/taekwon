import { List, Map, fromJS } from 'immutable';
import { expect } from 'chai';

import rings from '../rings';

describe('Server::rings', () => {
  
  it('deals with initial state', () => {
    const nextState = rings.reducer(undefined, {});
    expect(nextState).to.equal(fromJS([]));
  });
  
  it('can initialise rings', () => {
    const initialState = fromJS([]);
    const action = rings.actions.init(1);
    const nextState = rings.reducer(initialState, action);

    expect(nextState).to.equal(fromJS([
      {
        jp: null,
        cjs: [],
        slotCount: 4,
        matches: []
      }
    ]));
  });
  
  it('can add a ring', () => {
    const initialState = fromJS([]);
    const action = rings.actions.add();
    const nextState = rings.reducer(initialState, action);

    expect(nextState).to.equal(fromJS([
      {
        jp: null,
        cjs: [],
        slotCount: 4,
        matches: []
      }
    ]));
  });
  
  it('can remove a ring', () => {
    const initialState = fromJS([{}]);
    const action = rings.actions.remove();
    const nextState = rings.reducer(initialState, action);

    expect(nextState).to.equal(fromJS([]));
  });
  
  it('can open a ring by setting its Jury President', () => {
    const jpId = 'jp';
    
    const initialState = fromJS([{ jp: null }]);
    const action = rings.actions.open(0, jpId);
    const nextState = rings.reducer(initialState, action);

    expect(nextState).to.equal(fromJS([{ jp: jpId }]));
  });
  
  it('can close a ring by removing its Jury President', () => {
    const jpId = 'jp';
    
    const initialState = fromJS([{ jp: jpId }]);
    const action = rings.actions.close(0, jpId);
    const nextState = rings.reducer(initialState, action);

    expect(nextState).to.equal(fromJS([{ jp: null }]));
  });
  
  it('can add a Corner Judge to a ring', () => {
    const cjId = 'cj';
    
    const initialState = fromJS([{ cjs: [] }]);
    const action = rings.actions.addCJ(0, cjId);
    const nextState = rings.reducer(initialState, action);

    expect(nextState).to.equal(fromJS([{ cjs: [cjId] }]));
  });
  
  it('can remove a Corner Judge from a ring', () => {
    const cjId = 'cj';
    
    const initialState = fromJS([{ cjs: [cjId] }]);
    const action = rings.actions.removeCJ(0, cjId);
    const nextState = rings.reducer(initialState, action);

    expect(nextState).to.equal(fromJS([{ cjs: [] }]));
  });

});
