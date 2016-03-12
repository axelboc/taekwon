import { List, Map, fromJS } from 'immutable';
import { expect } from 'chai';

import rings from '../../server/rings';

describe('Rings', () => {
  
  describe('actions', () => {
    
    it('should create an action to initialise rings', () => {
      const count = 1;
      const action = rings.actions.init(count);
      
      expect(action).to.deep.equal({
        type: rings.actions.INIT,
        payload: { count }
      });
    });
    
    it('should create an action to add a ring', () => {
      const action = rings.actions.add();
      expect(action).to.deep.equal({ type: rings.actions.ADD });
    });
    
    it('should create an action to open a ring by setting its Jury President', () => {
      const index = 1;
      const jpId = 'jp';
      const action = rings.actions.open(index, jpId);
      
      expect(action).to.deep.equal({
        type: rings.actions.OPEN,
        payload: { index, jpId }
      });
    });
    
    it('should create an action to close a ring by removing its Jury President', () => {
      const index = 1;
      const action = rings.actions.close(index);
      
      expect(action).to.deep.equal({
        type: rings.actions.CLOSE,
        payload: { index }
      });
    });
    
  });
  
  describe('reducer', () => {

    it('returns initial state', () => {
      const nextState = rings.reducer(undefined, { type: '' });
      expect(nextState).to.equal(fromJS([]));
    });
    
    it('handles INIT', () => {
      const initialState = List();
      const action = { type: rings.actions.INIT, payload: { count: 1 } };
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
    
    it('handles ADD', () => {
      const initialState = List([Map()]);
      const action = { type: rings.actions.ADD };
      const nextState = rings.reducer(initialState, action);

      expect(nextState).to.equal(fromJS([
        {},
        {
          index: 1,
          jp: null,
          cjs: [],
          slotCount: 4,
          mathes: []
        }
      ]));
    });
    
    it('handles OPEN', () => {
      const jpId = 'jp';
      const initialState = List([Map({ jp: null })]);
      const action = { type: rings.actions.OPEN, payload: { index: 0, jpId } };
      const nextState = rings.reducer(initialState, action);

      expect(nextState).to.equal(fromJS([{ jp: jpId }]));
    });
    
    it('handles CLOSE', () => {
      const initialState = List([Map({ jp: 'jp' })]);
      const action = { type: rings.actions.CLOSE, payload: { index: 0 } };
      const nextState = rings.reducer(initialState, action);

      expect(nextState).to.equal(fromJS([{ jp: null }]));
    });
    
  });

});
