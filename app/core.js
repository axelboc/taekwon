
import { List, Map } from 'immutable';


export function addRing(state, ringId) {
	return state
		.setIn(['entities', 'rings', ringId], Map({
			id: ringId,
			juryPresident: null,
			cornerJudges: List()
		}))
		.update('rings', List(), rings => rings.push(ringId));
}

export function addUser(state, userId, identity, name) {
	var data = {
		id: userId,
		identity: identity,
		ring: null
	}
	
	if (identity === 'cornerJudge') {
		data.name = name;
		data.isAuthorised = false;
	}
	
	return state
		.setIn(['entities', 'users', userId], Map(data));
}
