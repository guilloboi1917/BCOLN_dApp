// utils/ipfs.js
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'http://localhost:5001' });

/**
 * Uploads a JavaScript object as a JSON file to IPFS.
 * @param {Object} data - The JSON-compatible object to upload.
 * @returns {Promise<string>} - The CID of the uploaded data.
 */
export async function uploadDataToIPFS(data) {
  const json = JSON.stringify(data);
  const { cid } = await ipfs.add(json);
  return cid.toString(); // e.g., "bafkreid..."
}

/**
 * Fetches and parses JSON data from IPFS using its CID.
 * @param {string} cid - The IPFS CID.
 * @returns {Promise<Object>} - The parsed JSON object.
 */
export async function getDataFromCID(cid) {
  const stream = ipfs.cat(cid);
  let data = '';
  for await (const chunk of stream) {
    data += new TextDecoder().decode(chunk);
  }
  return JSON.parse(data);
}
