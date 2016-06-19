/* eslint-disable */
const state = {
  rings: [ // ring identifier is index in array
    {
      jp: string || null, // JP ID if ring open; `null` if closed
      cjs: [...string], // IDs of CJs who have joined the ring (at most `slotCount`)
      slotCount: number, // max length of `cjs` array
      matches: [...string], // Match IDs
      matchConfig: {
         // ...
      }
    }
  ],
  users: {
    [id]: {
      identity: ('admin' || 'cj' || 'jp'),
      connected: boolean,
      ring: number || null, // ring index if has opened or joined a ring; `null` otherwise or if 'admin'
      data: null || { // `null` if not 'cj'
        name: string,
        authorised: boolean // whether CJ has been authorised to join a ring
      }
    }
  },
  matches: {
    [id]: {
    }
  }
};
