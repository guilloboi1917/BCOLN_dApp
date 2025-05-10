import { uploadDataToIPFS, getDataFromCID } from '../utils/ipfs.js';

async function main() {
  const mockData = {
    player1: '0x1234567890123456789012345678901234567890',
    player2: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    result: 'player1_won',
    round: 1,
    timestamp: new Date().toISOString()
  };

  // Upload
  const cid = await uploadDataToIPFS(mockData);
  console.log('CID from upload:', cid);

  // Retrieve
  const retrievedData = await getDataFromCID(cid);
  console.log('Retrieved JSON:', retrievedData);

  // Check match
  if (JSON.stringify(mockData) === JSON.stringify(retrievedData)) {
    console.log('IPFS Upload and Download Verified');
  } else {
    console.error('Mismatch in stored and retrieved data');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error during IPFS test:', err);
  process.exit(1);
});
