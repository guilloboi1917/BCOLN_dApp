import { uploadDataToIPFS, getDataFromCID } from '../utils/ipfs.js';

async function main() {
  const data = {
    player1: '0x123...',
    player2: '0xabc...',
    result: 'player1_won',
    timestamp: Date.now()
  };

  const cid = await uploadDataToIPFS(data);
  console.log('CID:', cid);

  const retrieved = await getDataFromCID(cid);
  console.log('Retrieved:', retrieved);
}

main();
