export function admin(state) {
  const subset = {};
  subset.foo = state.clients.foo;
  
  return subset;
} 
