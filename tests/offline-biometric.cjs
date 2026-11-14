const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { DatabaseSync } = require('node:sqlite');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(
    code,
    {
      exports,
      require: (n) => (n in mocks ? mocks[n] : require(n)),
      TextEncoder,
      console,
      setTimeout,
      clearTimeout,
    },
    { filename: file },
  );
  return exports;
}
const room = {
  roomId: 1,
  hotelId: 2,
  hotelName: 'Hotel',
  roomTypeName: 'Doble',
  district: 'Miraflores',
  city: 'Lima',
  capacity: 2,
  areaM2: 20,
  amenities: ['Wi-Fi'],
  nightlyPrice: 100,
  currency: 'PEN',
  isBookable: true,
  tourPath: null,
  token: 'never share',
};
const databaseFile = path.join('/tmp', `smartstay-${process.pid}.sqlite`);
let sqlite;
function cardsModule() {
  return load('src/offline/cards.ts', {
    'expo-sqlite': {
      openDatabaseAsync: async () => {
        sqlite = new DatabaseSync(databaseFile);
        return {
          execAsync: async (sql) => sqlite.exec(sql),
          runAsync: async (sql, ...args) => sqlite.prepare(sql).run(...args),
          getAllAsync: async (sql, ...args) => sqlite.prepare(sql).all(...args),
        };
      },
    },
  });
}
test('public schema, UTF-8 limit, persistence after reopening and duplicate upsert', async () => {
  let cards = cardsModule();
  const c = cards.fromRoom(room, '2026-11-12T10:00:00.000Z');
  assert.equal(JSON.stringify(c).includes('token'), false);
  assert.throws(() => cards.decode(JSON.stringify({ ...c, version: 2 })));
  assert.throws(() => cards.decode(JSON.stringify({ ...c, token: 'secret' })));
  assert.throws(() =>
    cards.decode(JSON.stringify({ ...c, room: { ...c.room, capacity: 0 } })),
  );
  assert.throws(() => cards.decode('é'.repeat(2049)));
  await cards.saveCard(c);
  await cards.saveCard(c);
  assert.equal((await cards.listCards()).length, 1);
  sqlite.close();
  cards = cardsModule();
  assert.equal((await cards.listCards())[0].room.hotelName, 'Hotel');
  await cards.saveCard({
    ...c,
    obtainedAt: '2026-11-11T10:00:00.000Z',
    room: { ...c.room, hotelName: 'Old' },
  });
  assert.equal((await cards.listCards())[0].room.hotelName, 'Hotel');
  sqlite.close();
  fs.unlinkSync(databaseFile);
});
const Button = (props) => React.createElement('button', props);
const native = {
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  AppState: {
    currentState: 'active',
    addEventListener: (_name, fn) => {
      native.change = fn;
      return { remove() {} };
    },
  },
};
async function press(tree, title) {
  await act(async () => {
    tree.root
      .findAllByType('button')
      .find((n) => n.props.title === title)
      .props.onPress();
  });
}
test('biometric cancellation stays locked; prompt AppState does not relock successful authentication', async () => {
  let success = true,
    logout = 0;
  const Gate = load('src/components/BiometricGate.tsx', {
    'react-native': native,
    './ui': { Button },
    '../state/session': { useSession: () => ({ logout: () => logout++ }) },
    'expo-local-authentication': {
      hasHardwareAsync: async () => true,
      getEnrolledLevelAsync: async () => 3,
      SecurityLevel: { BIOMETRIC_STRONG: 3 },
      authenticateAsync: async () => {
        native.change('background');
        native.change('active');
        return { success };
      },
    },
  }).default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(
        Gate,
        null,
        React.createElement('private', null, 'Reservas privadas'),
      ),
    );
  });
  await press(tree, 'Activar biometría para esta sesión');
  await act(async () => native.change('background'));
  assert.equal(tree.root.findAllByType('private').length, 0);
  success = false;
  await press(tree, 'Desbloquear con biometría');
  assert.equal(tree.root.findAllByType('private').length, 0);
  success = true;
  await press(tree, 'Desbloquear con biometría');
  assert.equal(tree.root.findAllByType('private').length, 1);
  await act(async () => native.change('background'));
  await press(tree, 'Volver al login habitual');
  assert.equal(logout, 1);
  await act(async () => tree.unmount());
});
test('Nearby rejection sends no card; receive ACK follows successful persistence, including duplicates', async () => {
  let listener,
    saved = 0,
    sent = [],
    failSave = false;
  const nearby = {
    addListener: (_, fn) => {
      listener = fn;
      return { remove() {} };
    },
    stop: async () => {},
    start: async () => {},
    confirm: async () => {},
    send: async (id, raw) => {
      assert.ok(saved > 0);
      sent.push(JSON.parse(raw));
    },
  };
  const Screen = load('src/screens/NearbyScreen.tsx', {
    'react-native': native,
    '../components/ui': { Button },
    '../offline/nearby': { nearby, permissions: async () => {} },
    '../offline/cards': {
      decode: JSON.parse,
      saveCard: async () => {
        if (failSave) throw Error('Disk full');
        saved++;
      },
    },
  }).default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { onBack() {} }));
  });
  await press(tree, 'Iniciar / reintentar');
  await act(async () =>
    listener({ type: 'verify', id: 'peer', value: '1234' }),
  );
  await press(tree, 'No coincide: rechazar');
  assert.equal(sent.length, 0);
  await press(tree, 'Iniciar / reintentar');
  const event = {
    type: 'message',
    id: 'peer',
    value: JSON.stringify({ messageId: 'abc' }),
  };
  await act(async () => listener(event));
  await act(async () => listener(event));
  assert.equal(sent.length, 2);
  assert.equal(sent[0].originalMessageId, 'abc');
  failSave = true;
  await act(async () => listener(event));
  assert.equal(sent.length, 2);
  await act(async () => tree.unmount());
});
test('401 clears in-memory session and backend operations reject offline', async () => {
  let network = { isConnected: true, isInternetReachable: true },
    unauthorized = 0,
    calls = [];
  const original = global.fetch;
  // Evaluate API in a context with a deterministic fetch rather than contacting a server.
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/api/client.ts'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (n) =>
      n === '@react-native-community/netinfo'
        ? { fetch: async () => network }
        : require(n),
    process: { env: {} },
    URLSearchParams,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return { ok: false, status: 401, text: async () => '' };
    },
  });
  exports.setToken('memory-only');
  exports.setUnauthorizedHandler(() => {
    unauthorized++;
    exports.setToken(null);
  });
  await assert.rejects(exports.api.myBookings());
  assert.equal(unauthorized, 1);
  assert.equal(calls[0].url.endsWith('/api/v1/bookings/mine'), true);
  network = { isConnected: false, isInternetReachable: false };
  await assert.rejects(
    exports.api.signIn('guest', 'password'),
    /requiere conexión/,
  );
  assert.equal(calls.length, 1);
});
