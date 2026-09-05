import { PeerServer } from 'peer';
PeerServer({ port: 9000, path: '/', allow_discovery: false });
console.log('Test-only PeerJS signaling server on :9000');
