import { makeRemote } from '../shared/remote-action';
import * as rings from '../../server/rings/actions';

export const addRing = makeRemote(rings.add);
