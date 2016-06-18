import { makeRemote } from '../shared/remoteAction';
import * as rings from '../../server/rings/actions';

export const addRing = makeRemote(rings.add);
