import admin from './admin-presenter';
import cj from './cj-presenter';

const presenters = { admin, cj };

export default function createPresenter(clientType, clientId) {
  return presenters[clientType].bind(null, clientId);
}
