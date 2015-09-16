
import { List, Map, fromJS } from 'immutable';
import { expect } from 'chai';

import { addRing, addUser } from '../../server/core';


const INITIAL_STATE = Map();


describe('application logic', () => {

	describe('addRing', () => {

		it('should add a ring to the state', () => {
			const ringId = 'test';
			const nextState = addRing(INITIAL_STATE, ringId);

			expect(nextState).to.equal(fromJS({
				entities: {
					rings: {
						[ringId]: {
							id: ringId,
							juryPresident: null,
							cornerJudges: []
						}
					}
				},
				rings: [ringId]
			}));
		});

	});

	describe('addUser', () => {

		it('should add a Jury President to the state', () => {
			const userId = 'test';
			const identity = 'juryPresident';
			const nextState = addUser(INITIAL_STATE, userId, identity);
			
			expect(nextState).to.equal(fromJS({
				entities: {
					users: {
						[userId]: {
							id: userId,
							identity: identity,
							ring: null
						}
					}
				}
			}));
		});
		
		it('should add a Corner Judge to the state', () => {
			const userId = 'test';
			const identity = 'cornerJudge';
			const name = 'John Doe';
			const nextState = addUser(INITIAL_STATE, userId, identity, name);
			
			expect(nextState).to.equal(fromJS({
				entities: {
					users: {
						[userId]: {
							id: userId,
							identity: identity,
							name: name,
							ring: null,
							isAuthorised: false
						}
					}
				}
			}));
		});
		
	});
	
});
